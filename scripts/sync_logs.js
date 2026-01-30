#!/usr/bin/env node

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Sync documents from a source Elasticsearch cluster to a destination cluster.
 * Runs in a loop: each cycle fetches documents (24h @timestamp window), transforms,
 * and bulk-pushes to destination. Source config via env/CLI; destination uses
 * the same cluster as Kibana (config file + env, like otel_demo).
 *
 * Usage:
 *   node scripts/sync_logs.js
 *   SOURCE_ELASTICSEARCH_HOST=https://... SOURCE_ELASTICSEARCH_API_KEY=... node scripts/sync_logs.js
 *   node scripts/sync_logs.js --source-host=https://... --source-api-key=...
 *
 * Source (required): SOURCE_ELASTICSEARCH_HOST, SOURCE_ELASTICSEARCH_API_KEY (or --source-host, --source-api-key)
 * Destination: read from config/kibana.dev.yml (or --config), env ELASTICSEARCH_HOST, ELASTICSEARCH_USERNAME, ELASTICSEARCH_PASSWORD
 * Sync options: SYNC_* env or --index-pattern, --size, --interval, --sample-mode, --target-index, etc.
 * Set env vars in the shell (e.g. export SOURCE_ELASTICSEARCH_HOST=...) or pass inline; CLI flags override env.
 */

require('@kbn/setup-node-env');

const path = require('path');
const fs = require('fs');
const yaml = require('js-yaml');
const getopts = require('getopts');
const { Client } = require('@elastic/elasticsearch');

const requestTimeoutMs = 30_000;
const BASE_QUERY = {
  bool: {
    must: [
      { match_all: {} },
      {
        range: {
          '@timestamp': { gte: 'now-24h', lte: 'now' },
        },
      },
    ],
  },
};

/**
 * Read Kibana config for destination Elasticsearch (same approach as otel_demo).
 * Uses config file (default config/kibana.dev.yml or --config), then env overrides.
 */
function readKibanaConfig(configPath, log) {
  const configPathToUse = path.resolve(
    process.cwd(),
    configPath || 'config/kibana.dev.yml'
  );
  let esConfigValues = {};

  if (fs.existsSync(configPathToUse)) {
    try {
      const loaded = yaml.load(fs.readFileSync(configPathToUse, 'utf8')) || {};
      // Support flat keys (elasticsearch.hosts) or nested (elasticsearch: { hosts })
      if (loaded.elasticsearch && typeof loaded.elasticsearch === 'object') {
        esConfigValues = loaded.elasticsearch;
      } else {
        for (const [key, value] of Object.entries(loaded)) {
          if (key.startsWith('elasticsearch.') && value != null) {
            const sub = key.slice('elasticsearch.'.length);
            esConfigValues[sub] = Array.isArray(value) ? value[0] : value;
          }
        }
      }
    } catch (err) {
      if (log) log(`Warning: could not read config ${configPathToUse}: ${err.message}`);
    }
  } else if (log) {
    log(`Config file not found at ${configPathToUse}; using env or defaults for destination.`);
  }

  const envOverrides = {};
  const esHost = process.env.ELASTICSEARCH_HOST;
  const esUser = process.env.ELASTICSEARCH_USERNAME;
  const esPass = process.env.ELASTICSEARCH_PASSWORD;
  if (esHost) envOverrides.hosts = esHost;
  if (esUser) envOverrides.username = esUser;
  if (esPass) envOverrides.password = esPass;

  return {
    hosts: 'http://localhost:9200',
    username: 'elastic',
    password: 'changeme',
    ...esConfigValues,
    ...envOverrides,
  };
}

function parseConfig(log = () => {}) {
  const opts = getopts(process.argv.slice(2), {
    alias: { h: 'help', v: 'verbose', c: 'config' },
    boolean: ['help', 'verbose', 'no-verify-certs'],
    string: [
      'config',
      'source-host',
      'source-api-key',
      'index-pattern',
      'size',
      'interval',
      'sample-mode',
      'random-seed',
      'target-index',
      'batch-size',
    ],
  });

  // Helper: CLI flag > env var > default (getopts sets "" for missing string opts)
  const get = (opt, envVar, fallback) =>
    opts[opt]?.trim() || process.env[envVar]?.trim() || fallback;

  const sourceHost = get('source-host', 'SOURCE_ELASTICSEARCH_HOST', undefined);
  const sourceApiKey = get('source-api-key', 'SOURCE_ELASTICSEARCH_API_KEY', undefined);
  const indexPattern = get('index-pattern', 'SYNC_INDEX_PATTERN', 'logs*');
  const size = get('size', 'SYNC_SIZE', '100');
  const interval = get('interval', 'SYNC_INTERVAL_SECONDS', '1');
  const sampleMode = get('sample-mode', 'SYNC_SAMPLE_MODE', 'random');
  const randomSeed = get('random-seed', 'SYNC_RANDOM_SEED', undefined);
  const targetIndex = get('target-index', 'SYNC_TARGET_INDEX', 'logs-generic-default');
  const batchSize = get('batch-size', 'SYNC_BATCH_SIZE', '100');

  const destEsConfig = readKibanaConfig(opts.config, log);
  const destHost =
    typeof destEsConfig.hosts === 'string'
      ? destEsConfig.hosts
      : Array.isArray(destEsConfig.hosts)
        ? destEsConfig.hosts[0]
        : 'http://localhost:9200';

  const config = {
    sourceHost,
    sourceApiKey,
    destHost: destHost.replace(/\/$/, ''),
    destUsername: destEsConfig.username || 'elastic',
    destPassword: destEsConfig.password || 'changeme',
    indexPattern,
    size: parseInt(size, 10),
    intervalSeconds: parseFloat(interval),
    sampleMode,
    randomSeed: randomSeed !== undefined ? parseInt(randomSeed, 10) : null,
    targetIndex,
    batchSize: parseInt(batchSize, 10),
    noVerifyCerts: opts['no-verify-certs'] ?? false,
    verbose: opts.verbose ?? false,
  };

  if (!config.sourceHost || !config.sourceApiKey) {
    console.error(
      'Error: SOURCE_ELASTICSEARCH_HOST and SOURCE_ELASTICSEARCH_API_KEY (or --source-host and --source-api-key) are required.'
    );
    process.exit(1);
  }
  if (config.sampleMode !== 'recent' && config.sampleMode !== 'random') {
    console.error('Error: --sample-mode must be "recent" or "random".');
    process.exit(1);
  }
  if (Number.isNaN(config.size) || config.size < 1) {
    console.error('Error: --size must be a positive integer.');
    process.exit(1);
  }
  if (Number.isNaN(config.batchSize) || config.batchSize < 1) {
    console.error('Error: --batch-size must be a positive integer.');
    process.exit(1);
  }
  if (config.randomSeed !== null && Number.isNaN(config.randomSeed)) {
    console.error('Error: --random-seed must be an integer.');
    process.exit(1);
  }

  return config;
}

function createSourceClient(config, log) {
  const node = config.sourceHost.replace(/\/$/, '');
  const client = new Client({
    node,
    auth: { apiKey: config.sourceApiKey },
    requestTimeout: requestTimeoutMs,
    tls: config.noVerifyCerts ? { rejectUnauthorized: false } : undefined,
  });
  return client;
}

function createDestClient(config, log) {
  const node = config.destHost.replace(/\/$/, '');
  const client = new Client({
    node,
    auth: { username: config.destUsername, password: config.destPassword },
    requestTimeout: requestTimeoutMs,
    tls: config.noVerifyCerts ? { rejectUnauthorized: false } : undefined,
  });
  return client;
}

async function pingCluster(client, label, log) {
  try {
    const info = await client.info();
    const name = info.cluster_name ?? 'unknown';
    const version = info.version?.number ?? 'unknown';
    log(`[${label}] Connected: ${name} (${version})`);
  } catch (err) {
    log(`[${label}] Connection failed: ${err.message}`);
    throw err;
  }
}

function search(sourceClient, config, cycleNumber, log) {
  const size = config.size;
  const indexPattern = config.indexPattern;
  let body;
  if (config.sampleMode === 'recent') {
    body = {
      query: BASE_QUERY,
      sort: [{ '@timestamp': { order: 'desc' } }],
      size,
    };
  } else {
    const seed =
      config.randomSeed !== null
        ? config.randomSeed
        : (config.runSeed ?? Date.now()) + cycleNumber;
    body = {
      query: {
        function_score: {
          query: BASE_QUERY,
          functions: [{ random_score: { seed } }],
          score_mode: 'sum',
        },
      },
      size,
    };
  }

  return sourceClient
    .search({ index: indexPattern, body })
    .then((res) => {
      const hits = res.hits?.hits ?? [];
      return hits.map((hit) => ({
        _index: hit._index,
        _id: hit._id,
        _source: hit._source ?? {},
        ...(hit._score != null && { _score: hit._score }),
      }));
    })
    .catch((err) => {
      log(`Search failed: ${err.message}`);
      return [];
    });
}

// This cleanup is needed in the scenario where multiple data streams are being synced to the same index.
// As these fields are constant keywords in the data stream naming scheme, it would mean only documents
// with the same data stream fields would be accepted.
function stripDataStreamFields(doc) {
  const src = doc._source;
  if (!src || typeof src !== 'object') return;
  for (const key of Object.keys(src)) {
    if (key.startsWith('data_stream.')) {
      delete src[key];
    }
  }
}

function transform(docs, targetIndex) {
  for (const doc of docs) {
    stripDataStreamFields(doc);
    if (targetIndex) {
      doc._index = targetIndex;
    }
  }
}

function backingIndexToStreamName(index) {
  if (typeof index !== 'string') return index;
  if (!index.startsWith('.ds-')) return index;
  const withoutPrefix = index.slice(4);
  const parts = withoutPrefix.split('-');
  if (parts.length >= 3) {
    return parts.slice(0, -2).join('-');
  }
  return index;
}

async function ensureDataStreamExists(destClient, name, log) {
  try {
    await destClient.indices.getDataStream({ name });
    return true;
  } catch (err) {
    if (err.meta?.statusCode === 404) {
      try {
        await destClient.indices.createDataStream({ name });
        log(`Created data stream: ${name}`);
        return true;
      } catch (createErr) {
        log(`Failed to create data stream ${name}: ${createErr.message}`);
        return false;
      }
    }
    log(`Failed to get data stream ${name}: ${err.message}`);
    return false;
  }
}

async function uploadDocumentsToStream(destClient, docs, targetStreamOrIndex, batchSize, log) {
  if (docs.length === 0) return 0;

  const exists = await ensureDataStreamExists(destClient, targetStreamOrIndex, log);
  if (!exists) return 0;

  let totalUploaded = 0;
  for (let i = 0; i < docs.length; i += batchSize) {
    const batch = docs.slice(i, i + batchSize);
    const operations = [];
    for (const doc of batch) {
      // Do not send _id so ES auto-generates; avoids "document already exists" when same doc is synced again
      operations.push({ create: { _index: targetStreamOrIndex } });
      operations.push(doc._source ?? doc);
    }

    try {
      const response = await destClient.bulk({
        operations,
        refresh: false,
      });

      if (response.errors) {
        const items = response.items ?? [];
        for (const item of items) {
          const create = item.create;
          if (create?.error) {
            log(
              `Bulk create error [${create._index}] (ES _id: ${create._id ?? 'auto-generated'}): ${create.error.reason ?? JSON.stringify(create.error)}`
            );
          } else if (create) {
            totalUploaded += 1;
          }
        }
      } else {
        totalUploaded += batch.length;
      }
    } catch (err) {
      log(`Bulk request failed: ${err.message}`);
    }
  }
  return totalUploaded;
}

async function runSyncCycle(sourceClient, destClient, config, cycleNumber, log) {
  const docs = await search(sourceClient, config, cycleNumber, log);
  if (docs.length === 0) return 0;
  transform(docs, config.targetIndex);

  if (config.targetIndex) {
    return uploadDocumentsToStream(
      destClient,
      docs,
      config.targetIndex,
      config.batchSize,
      log
    );
  }

  const byStream = new Map();
  for (const doc of docs) {
    const streamName = backingIndexToStreamName(doc._index);
    if (!byStream.has(streamName)) byStream.set(streamName, []);
    byStream.get(streamName).push(doc);
  }

  let total = 0;
  for (const [streamName, groupDocs] of byStream) {
    total += await uploadDocumentsToStream(
      destClient,
      groupDocs,
      streamName,
      config.batchSize,
      log
    );
  }
  return total;
}

function showHelp() {
  console.log(`
Sync Logs - Copy documents from source Elasticsearch to destination.

Usage:
  node scripts/sync_logs.js [options]

Source (required):
  SOURCE_ELASTICSEARCH_HOST    or  --source-host       Source cluster URL
  SOURCE_ELASTICSEARCH_API_KEY or  --source-api-key    Source API key

Destination (same cluster as Kibana, like otel_demo):
  Read from config/kibana.dev.yml (or --config). Set ELASTICSEARCH_HOST, ELASTICSEARCH_USERNAME, ELASTICSEARCH_PASSWORD in the shell or pass inline. Defaults: http://localhost:9200, elastic, changeme.

Set env vars in the shell (e.g. export SOURCE_ELASTICSEARCH_HOST=...) or pass inline; CLI flags override env.

Sync options:
  SYNC_INDEX_PATTERN           or  --index-pattern    (default: logs*)
  SYNC_SIZE                    or  --size             (default: 100)
  SYNC_INTERVAL_SECONDS        or  --interval         (default: 5)
  SYNC_SAMPLE_MODE             or  --sample-mode      recent|random (default: random)
  SYNC_RANDOM_SEED             or  --random-seed      For random mode
  SYNC_TARGET_INDEX            or  --target-index     Single target index/stream (default: logs-generic-default)
  SYNC_BATCH_SIZE              or  --batch-size       (default: 100)

Other:
  --config, -c                 Path to Kibana config (default: config/kibana.dev.yml)
  --no-verify-certs            Disable TLS verification
  --verbose, -v                Verbose logging
  --help, -h                   This help
`);
}

async function main() {
  const opts = getopts(process.argv.slice(2), {
    alias: { h: 'help', v: 'verbose' },
    boolean: ['help', 'verbose'],
  });
  if (opts.help) {
    showHelp();
    process.exit(0);
  }

  const config = parseConfig();
  const log = config.verbose
    ? (msg) => console.log(`[${new Date().toISOString()}] ${msg}`)
    : (msg) => console.log(msg);

  if (config.randomSeed === null) {
    config.runSeed = Date.now();
  }

  const sourceClient = createSourceClient(config, log);
  const destClient = createDestClient(config, log);

  await pingCluster(sourceClient, 'source', log);
  await pingCluster(destClient, 'dest', log);

  let shutdownRequested = false;
  const onSignal = () => {
    shutdownRequested = true;
    log('Shutdown requested; finishing current cycle...');
  };
  process.on('SIGINT', onSignal);
  process.on('SIGTERM', onSignal);

  let cycle = 0;
  while (!shutdownRequested) {
    cycle += 1;
    try {
      const pushed = await runSyncCycle(sourceClient, destClient, config, cycle, log);
      log(`Cycle ${cycle}: pushed ${pushed} documents`);
    } catch (err) {
      log(`Cycle ${cycle} failed: ${err.message}`);
    }
    if (shutdownRequested) break;
    await new Promise((r) => setTimeout(r, config.intervalSeconds * 1000));
  }

  log('Sync stopped.');
  process.exit(0);
}

if (require.main === module) {
  main().catch((err) => {
    console.error('Fatal:', err);
    process.exit(1);
  });
}

module.exports = {
  parseConfig,
  createSourceClient,
  createDestClient,
  search,
  transform,
  backingIndexToStreamName,
  uploadDocumentsToStream,
  runSyncCycle,
};
