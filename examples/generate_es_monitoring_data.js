#!/usr/bin/env node

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Script de ejemplo para generar datos de monitorización de Elasticsearch
 * con node_stats usando synthtrace.
 *
 * Uso:
 *   node examples/generate_es_monitoring_data.js
 *
 * Opciones:
 *   --target <url>     URL de Elasticsearch (default: http://localhost:9200)
 *   --from <time>      Tiempo de inicio (default: now-1h)
 *   --to <time>        Tiempo de fin (default: now)
 *   --interval <time>  Intervalo entre documentos (default: 1m)
 */

const { Client } = require('@elastic/elasticsearch');
const { generateShortId } = require('@kbn/synthtrace-client');
const { nodeStats } = require('@kbn/synthtrace-client/src/lib/monitoring/node_stats');

// Configuración
const config = {
  target: process.env.ES_URL || 'http://localhost:9200',
  username: process.env.ES_USERNAME || 'elastic',
  password: process.env.ES_PASSWORD || 'changeme',
  from: Date.now() - 60 * 60 * 1000, // 1 hora atrás
  to: Date.now(),
  interval: 60 * 1000, // 1 minuto
};

// Constantes para tamaños de disco
const GB_100 = 107374182400;
const GB_200 = 214748364800;
const GB_500 = 536870912000;
const GB_50 = 53687091200;

// Configuración del cluster
const clusterName = 'es-monitoring-cluster';
const clusterUuid = generateShortId();

// Definición de nodos
const nodes = [
  // Hot tier nodes
  {
    name: 'es-node-hot-1',
    uuid: generateShortId(),
    tier: 'hot',
    availableBytes: GB_100,
    totalBytes: GB_500,
  },
  {
    name: 'es-node-hot-2',
    uuid: generateShortId(),
    tier: 'hot',
    availableBytesMin: GB_100,
    availableBytesMax: GB_200,
    totalBytes: GB_500,
  },
  {
    name: 'es-node-hot-3',
    uuid: generateShortId(),
    tier: 'hot',
    availableBytes: GB_200,
    totalBytes: GB_500,
  },
  // Cold tier nodes
  {
    name: 'es-node-cold-1',
    uuid: generateShortId(),
    tier: 'cold',
    availableBytes: GB_100,
    totalBytes: GB_500,
  },
  {
    name: 'es-node-cold-2',
    uuid: generateShortId(),
    tier: 'cold',
    availableBytes: GB_50,
    totalBytes: GB_500,
  },
  {
    name: 'es-node-cold-3',
    uuid: generateShortId(),
    tier: 'cold',
    availableBytesMin: GB_100,
    availableBytesMax: GB_200,
    totalBytes: GB_500,
  },
];

async function generateAndIndexData() {
  console.log('🚀 Iniciando generación de datos de monitorización de Elasticsearch\n');
  console.log(`📊 Configuración:`);
  console.log(`   - Target: ${config.target}`);
  console.log(
    `   - Rango: ${new Date(config.from).toISOString()} - ${new Date(config.to).toISOString()}`
  );
  console.log(`   - Intervalo: ${config.interval / 1000}s`);
  console.log(`   - Nodos: ${nodes.length}\n`);

  // Crear cliente de Elasticsearch
  const client = new Client({
    node: config.target,
    auth: {
      username: config.username,
      password: config.password,
    },
  });

  try {
    // Verificar conexión
    await client.ping();
    console.log('✅ Conectado a Elasticsearch\n');
  } catch (error) {
    console.error('❌ Error conectando a Elasticsearch:', error.message);
    console.error('   Asegúrate de que Elasticsearch esté ejecutándose en', config.target);
    process.exit(1);
  }

  // Generar documentos
  const documents = [];
  let timestamp = config.from;
  let docCount = 0;

  console.log('📝 Generando documentos...\n');

  while (timestamp <= config.to) {
    for (const node of nodes) {
      // Calcular bytes disponibles
      let availableBytes;
      if ('availableBytes' in node) {
        availableBytes = node.availableBytes;
      } else {
        const timeFactor = Math.sin(timestamp / 1000000) * 0.5 + 0.5;
        availableBytes =
          node.availableBytesMin + (node.availableBytesMax - node.availableBytesMin) * timeFactor;
      }

      // Métricas realistas
      const docCountMetric = Math.floor(1000000 + Math.random() * 500000);
      const storeSizeBytes = Math.floor(
        (node.totalBytes - availableBytes) * 0.8 + Math.random() * 1000000000
      );
      const cpuPercent = Math.floor(20 + Math.random() * 60);
      const heapUsedPercent = Math.floor(40 + Math.random() * 40);
      const heapMaxBytes = 4294967296; // 4GB

      // Crear documento
      const doc = {
        '@timestamp': new Date(timestamp).toISOString(),
        cluster_uuid: clusterUuid,
        type: 'node_stats',
        timestamp: new Date(timestamp).toISOString(),
        source_node: {
          uuid: node.uuid,
          name: node.name,
          transport_address: `${node.name}.elastic.local:9300`,
        },
        node_stats: {
          node_id: node.uuid,
          fs: {
            total: {
              available_in_bytes: availableBytes,
              available_in_byhtes: availableBytes, // Typo intencional para compatibilidad
              total_in_bytes: node.totalBytes,
            },
          },
          process: {
            cpu: {
              percent: cpuPercent,
            },
          },
          jvm: {
            mem: {
              heap_used_percent: heapUsedPercent,
              heap_max_in_bytes: heapMaxBytes,
            },
          },
          indices: {
            docs: {
              count: docCountMetric,
            },
            store: {
              size_in_bytes: storeSizeBytes,
            },
          },
        },
      };

      documents.push(doc);
      docCount++;
    }

    timestamp += config.interval;
  }

  console.log(`✅ Generados ${docCount} documentos\n`);

  // Indexar documentos en bulk
  console.log('💾 Indexando documentos en Elasticsearch...\n');

  const indexName = '.monitoring-es-8';
  const bulkBody = documents.flatMap((doc) => [{ index: { _index: indexName } }, doc]);

  try {
    const bulkResponse = await client.bulk({
      refresh: 'wait_for',
      body: bulkBody,
    });

    if (bulkResponse.errors) {
      console.error('⚠️  Algunos documentos fallaron al indexarse');
      const erroredDocuments = bulkResponse.items.filter((item) => item.index?.error);
      console.error(`   Errores: ${erroredDocuments.length}/${docCount}`);
      erroredDocuments.slice(0, 5).forEach((item) => {
        console.error(`   - ${item.index.error.type}: ${item.index.error.reason}`);
      });
    } else {
      console.log(`✅ Indexados ${docCount} documentos exitosamente\n`);
    }

    // Mostrar resumen por nodo
    console.log('📊 Resumen de nodos generados:\n');
    nodes.forEach((node) => {
      const docsPerNode = docCount / nodes.length;
      const availableGB = Math.round(
        ('availableBytes' in node ? node.availableBytes : node.availableBytesMin) /
          1024 /
          1024 /
          1024
      );
      const matchesQuery = availableGB === 100 ? '✓' : ' ';
      console.log(
        `   ${matchesQuery} ${node.name.padEnd(
          20
        )} - ${availableGB} GB disponibles - ${docsPerNode} docs`
      );
    });

    console.log('\n🎉 Proceso completado!\n');
    console.log('📝 Prueba la query ES|QL en Kibana Dev Console:\n');
    console.log('FROM .monitoring-es-*');
    console.log('  | WHERE source_node.name LIKE "-hot-" OR source_node.name LIKE "-cold-"');
    console.log(
      '  | STATS min_available_bytes = MIN(node_stats.fs.total.available_in_byhtes) BY source_node.name'
    );
    console.log('  | WHERE min_available_bytes = 107374182400');
    console.log('  | KEEP source_node.name, min_available_bytes\n');
  } catch (error) {
    console.error('❌ Error indexando documentos:', error.message);
    process.exit(1);
  }
}

// Ejecutar
generateAndIndexData().catch(console.error);
