// ============================================================
// BANCO DE DADOS SIMULADO - Zonas de Ocorrências (Histórico)
// ============================================================
var bancoDeDados = [
  // Zona A - Região Central (Furtos frequentes)
  { latitude: -23.5501, longitude: -46.6334, tipo: "Furto", periodo: "Noite" },
  { latitude: -23.5505, longitude: -46.6331, tipo: "Furto", periodo: "Noite" },
  { latitude: -23.5498, longitude: -46.6340, tipo: "Furto", periodo: "Tarde" },
  { latitude: -23.5510, longitude: -46.6329, tipo: "Roubo", periodo: "Noite" },

  // Zona B - Bairro Comercial (Roubo de veículos)
  { latitude: -23.5612, longitude: -46.6550, tipo: "Roubo de Veículo", periodo: "Manhã" },
  { latitude: -23.5615, longitude: -46.6558, tipo: "Roubo de Veículo", periodo: "Noite" },
  { latitude: -23.5608, longitude: -46.6542, tipo: "Furto de Veículo", periodo: "Tarde" },
  { latitude: -23.5620, longitude: -46.6561, tipo: "Roubo de Veículo", periodo: "Noite" },

  // Zona C - Área Industrial / Periferia (Ocorrências graves)
  { latitude: -23.5890, longitude: -46.6900, tipo: "Assalto com violência", periodo: "Madrugada" },
  { latitude: -23.5895, longitude: -46.6905, tipo: "Assalto com violência", periodo: "Madrugada" },
  { latitude: -23.5888, longitude: -46.6892, tipo: "Tráfico de entorpecentes", periodo: "Noite" },
  { latitude: -23.5902, longitude: -46.6912, tipo: "Assalto com violência", periodo: "Madrugada" },

  // Outliers (Ocorrências isoladas que o DBSCAN tratará como ruído)
  { latitude: -23.5200, longitude: -46.6100, tipo: "Vandalismo", periodo: "Tarde" },
  { latitude: -23.6000, longitude: -46.6400, tipo: "Furto", periodo: "Manhã" }
];

// ============================================================
// EXTRACTOR E DISTÂNCIA ESPACIAL
// ============================================================

function extrairCoordenadas(ocorrencia) {
  return [ocorrencia.latitude, ocorrencia.longitude];
}

function distancia(a, b) {
  var soma = 0;
  for (var i = 0; i < a.length; i++) {
    soma += Math.pow(a[i] - b[i], 2);
  }
  return Math.sqrt(soma);
}

// ============================================================
// DBSCAN (Compatível com ES5 antigo)
// ============================================================

function dbscan(dados, eps, minPts) {
  var grupos = [];
  var visitado = new Array(dados.length).fill(false);
  var grupoDoPonto = new Array(dados.length).fill(-1);

  function encontrarVizinhos(indice) {
    var vizinhos = [];
    for (var i = 0; i < dados.length; i++) {
      if (distancia(dados[indice], dados[i]) <= eps) {
        vizinhos.push(i);
      }
    }
    return vizinhos;
  }

  function expandirGrupo(indice, vizinhos, grupoAtual) {
    grupos[grupoAtual].push(indice);
    grupoDoPonto[indice] = grupoAtual;

    for (var i = 0; i < vizinhos.length; i++) {
      var vizinho = vizinhos[i];

      if (!visitado[vizinho]) {
        visitado[vizinho] = true;
        var novosVizinhos = encontrarVizinhos(vizinho);

        if (novosVizinhos.length >= minPts) {
          vizinhos = vizinhos.concat(novosVizinhos);
        }
      }

      if (grupoDoPonto[vizinho] === -1) {
        grupos[grupoAtual].push(vizinho);
        grupoDoPonto[vizinho] = grupoAtual;
      }
    }
  }

  for (var i = 0; i < dados.length; i++) {
    if (visitado[i]) continue;

    visitado[i] = true;
    var vizinhos = encontrarVizinhos(i);

    if (vizinhos.length >= minPts) {
      var grupoAtual = grupos.length;
      grupos.push([]);
      expandirGrupo(i, vizinhos, grupoAtual);
    }
  }

  // Corrigido para evitar o Shorthand que quebrava seu terminal
  return { grupos: grupos, grupoDoPonto: grupoDoPonto };
}

// ============================================================
// ANÁLISE DE HISTÓRICO DA ZONA
// ============================================================

function crimeMaisComum(indices) {
  var contagem = {};

  indices.forEach(function(i) {
    var tipo = bancoDeDados[i].tipo;
    contagem[tipo] = (contagem[tipo] || 0) + 1;
  });

  var crimePredominante = "";
  var maior = 0;

  for (var tipo in contagem) {
    if (contagem[tipo] > maior) {
      maior = contagem[tipo];
      crimePredominante = tipo;
    }
  }

  return crimePredominante;
}

function acaoSeguranca(tipoCrime) {
  if (tipoCrime === "Assalto com violência" || tipoCrime === "Tráfico de entorpecentes") {
    return "ALERTA CRÍTICO: Enviar patrulhamento tático motorizado (Choque/Rotam) e estabelecer bloqueios.";
  }
  if (tipoCrime === "Roubo de Veículo" || tipoCrime === "Furto de Veículo") {
    return "ALERTA MÉDIO: Intensificar rondas preventivas e acionar câmeras de monitoramento OCR (leitura de placas).";
  }
  if (tipoCrime === "Furto" || tipoCrime === "Vandalismo") {
    return "ALERTA PREVENTIVO: Reforçar policiamento comunitário a pé e solicitar melhoria na iluminação pública.";
  }
  return "Padrão normal: Manter o monitoramento de rotina na área.";
}

// ============================================================
// CLASSIFICAR COORDENADA (Função Chamada pelo Botão)
// ============================================================

function classificarOcorrencia() {
  var novaOcorrencia = {
    latitude: Number(document.getElementById("latitude").value),
    longitude: Number(document.getElementById("longitude").value)
  };

  var dadosExistentes = bancoDeDados.map(extrairCoordenadas);
  var coordenadaNova = extrairCoordenadas(novaOcorrencia);

  // Corrigido: usando .concat() clássico em vez do operador spread (...)
  var todosOsDados = dadosExistentes.concat([coordenadaNova]);

  // Raio (eps) de 0.005 graus geográficos aproximam-se de 500 metros. 
  // minPts: Mínimo de 3 registros próximos para consolidar um agrupamento (Hotspot)
  var resultado = dbscan(todosOsDados, 0.005, 3);

  var indiceNovaOcorrencia = todosOsDados.length - 1;
  var grupoZona = resultado.grupoDoPonto[indiceNovaOcorrencia];

  var diagnostico;
  var diretriz;

  if (grupoZona === -1) {
    diagnostico = "Ocorrência em Ponto Isolado";
    diretriz = "Registrar dados no sistema. Sem necessidade de deslocamento de reforço imediato.";
  } else {
    // Filtra para analisar os vizinhos históricos do grupo, ignorando a si mesmo
    var indicesGrupo = resultado.grupos[grupoZona].filter(function(i) {
      return i !== indiceNovaOcorrencia;
    });

    var crimePredominante = crimeMaisComum(indicesGrupo);
    diagnostico = "ZONA QUENTE DETECTADA (Foco de " + crimePredominante + ")";
    diretriz = acaoSeguranca(crimePredominante);
  }

  // Renderiza no HTML
  document.getElementById("resultado").innerHTML = 
    "<strong>Status do Local:</strong> " + diagnostico + "<br>" +
    "<strong>Diretriz de Segurança:</strong> " + diretriz + "<br><br>" +
    "<strong>Classificação DBSCAN:</strong> " + (grupoZona === -1 ? "Ruído / Fora de Zona de Risco" : "Cluster #" + grupoZona) + "<br><br>" +
    "<strong>Coordenadas Informadas:</strong><br>" +
    "Lat: " + novaOcorrencia.latitude + " | Lng: " + novaOcorrencia.longitude;
}
