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

var path = require('path');
var fs = require('fs');
var yaml = require('js-yaml');
var getopts = require('getopts');
var elasticsearch = require('@elastic/elasticsearch');
var Client = elasticsearch.Client;

var requestTimeoutMs = 30000;

/**
 * Read Kibana config for destination Elasticsearch (same approach as otel_demo).
 * Uses config file (default config/kibana.dev.yml or --config), then env overrides.
 */
function readKibanaConfig(configPath, log) {
  var configPathToUse = path.resolve(process.cwd(), '../config/kibana.dev.yml');

  if (configPath) {
    configPathToUse = path.resolve(process.cwd(), configPath);
  }
  if (!fs.existsSync(configPathToUse)) {
    configPathToUse = path.resolve(process.cwd(), 'config/kibana.dev.yml');
  }
  var esConfigValues = {};

  if (fs.existsSync(configPathToUse)) {
    try {
      var loaded = yaml.load(fs.readFileSync(configPathToUse, 'utf8')) || {};
      // Support flat keys (elasticsearch.hosts) or nested (elasticsearch: { hosts })
      if (loaded.elasticsearch && typeof loaded.elasticsearch === 'object') {
        esConfigValues = loaded.elasticsearch;
      } else {
        for (var key in loaded) {
          if (Object.prototype.hasOwnProperty.call(loaded, key)) {
            var value = loaded[key];
            if (key.startsWith('elasticsearch.') && value != null) {
              var sub = key.slice('elasticsearch.'.length);
              esConfigValues[sub] = Array.isArray(value) ? value[0] : value;
            }
          }
        }
      }
    } catch (err) {
      if (log) log('Warning: could not read config ' + configPathToUse + ': ' + err.message);
    }
  } else if (log) {
    log('Config file not found at ' + configPathToUse + '; using env or defaults for destination.');
  }

  var envOverrides = {};
  var esHost = process.env.ELASTICSEARCH_HOST;
  var esUser = process.env.ELASTICSEARCH_USERNAME;
  var esPass = process.env.ELASTICSEARCH_PASSWORD;
  if (esHost) envOverrides.hosts = esHost;
  if (esUser) envOverrides.username = esUser;
  if (esPass) envOverrides.password = esPass;

  var baseConfig = {
    hosts: 'http://localhost:9200',
    username: 'elastic',
    password: 'changeme',
  };

  Object.keys(esConfigValues).forEach(function (key) {
    baseConfig[key] = esConfigValues[key];
  });

  Object.keys(envOverrides).forEach(function (key) {
    baseConfig[key] = envOverrides[key];
  });

  if (baseConfig.username === 'kibana_system_user') {
    baseConfig.username = 'elastic';
  }

  return baseConfig;
}

/**
 * Parse an ISO-style date string as UTC.
 * JavaScript's Date constructor parses strings without a timezone (e.g. "2024-01-01T00:00:00")
 * as local time, which causes a timezone offset when comparing to UTC (e.g. @timestamp, Date.now()).
 * Treating from/to as UTC keeps the translation consistent with Elasticsearch and "now".
 */
function parseDateAsUtc(s) {
  if (!s || typeof s !== 'string') return null;
  var trimmed = s.trim();
  if (!trimmed) return null;
  // Already has timezone designator (Z or ±hh:mm or ±hhmm)?
  if (/Z|[+-]\d{2}:?\d{2}$/.test(trimmed)) {
    return new Date(trimmed);
  }
  return new Date(trimmed + 'Z');
}

function parseConfig(log) {
  if (log === void 0) {
    log = function () {};
  }
  var opts = getopts(process.argv.slice(2), {
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
      'from',
      'to',
      'translate-timestamps',
    ],
  });

  // Helper: CLI flag > env var > default (getopts sets "" for missing string opts)
  var get = function (opt, envVar, fallback) {
    var optValue = opts[opt];
    var envValue = process.env[envVar];
    return (optValue && optValue.trim()) || (envValue && envValue.trim()) || fallback;
  };

  var sourceHost = get('source-host', 'SOURCE_ELASTICSEARCH_HOST', undefined);
  var sourceApiKey = get('source-api-key', 'SOURCE_ELASTICSEARCH_API_KEY', undefined);
  var indexPattern = get('index-pattern', 'SYNC_INDEX_PATTERN', 'logs*');
  var size = get('size', 'SYNC_SIZE', '100');
  var interval = get('interval', 'SYNC_INTERVAL_SECONDS', '1');
  var sampleMode = get('sample-mode', 'SYNC_SAMPLE_MODE', 'random');
  var randomSeed = get('random-seed', 'SYNC_RANDOM_SEED', undefined);
  var targetIndex = get('target-index', 'SYNC_TARGET_INDEX', 'logs-generic-default');
  var batchSize = get('batch-size', 'SYNC_BATCH_SIZE', '100');
  var from = get('from', 'SYNC_FROM', undefined);
  var to = get('to', 'SYNC_TO', undefined);
  var translateTimestampsRaw =
    opts['translate-timestamps'] !== undefined
      ? opts['translate-timestamps']
      : process.env.SYNC_TRANSLATE_TIMESTAMPS;
  var translateTimestamps;

  if (translateTimestampsRaw !== undefined) {
    if (translateTimestampsRaw === '' || translateTimestampsRaw === 'true') {
      translateTimestamps = true;
    } else if (translateTimestampsRaw === 'live') {
      translateTimestamps = 'live';
    } else {
      var hours = parseFloat(translateTimestampsRaw);
      if (Number.isNaN(hours) || hours <= 0) {
        console.error(
          'Error: --translate-timestamps/SYNC_TRANSLATE_TIMESTAMPS value must be "live" or a positive number of hours.'
        );
        process.exit(1);
      }
      translateTimestamps = hours;
    }
  } else {
    translateTimestamps = false;
  }

  var destEsConfig = readKibanaConfig(opts.config, log);
  var destHost;
  if (typeof destEsConfig.hosts === 'string') {
    destHost = destEsConfig.hosts;
  } else if (Array.isArray(destEsConfig.hosts)) {
    destHost = destEsConfig.hosts[0];
  } else {
    destHost = 'http://localhost:9200';
  }

  var config = {
    sourceHost: sourceHost,
    sourceApiKey: sourceApiKey,
    destHost: destHost.replace(/\/$/, ''),
    destUsername: destEsConfig.username || 'elastic',
    destPassword: destEsConfig.password || 'changeme',
    indexPattern: indexPattern,
    size: parseInt(size, 10),
    intervalSeconds: parseFloat(interval),
    sampleMode: sampleMode,
    randomSeed: randomSeed !== undefined ? parseInt(randomSeed, 10) : null,
    targetIndex: targetIndex,
    batchSize: parseInt(batchSize, 10),
    noVerifyCerts: opts['no-verify-certs'] || false,
    verbose: opts.verbose || false,
    from: from,
    to: to,
    translateTimestamps: translateTimestamps,
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
  if ((config.from && !config.to) || (!config.from && config.to)) {
    console.error('Error: Both --from and --to must be provided.');
    process.exit(1);
  }
  if (config.from && config.to) {
    if (parseDateAsUtc(config.from) >= parseDateAsUtc(config.to)) {
      console.error('Error: --from must be before --to.');
      process.exit(1);
    }
  }
  if (config.translateTimestamps && (!config.from || !config.to)) {
    console.error('Error: --translate-timestamps can only be used with --from and --to.');
    process.exit(1);
  }

  return config;
}

function createSourceClient(config) {
  var node = config.sourceHost.replace(/\/$/, '');
  var client = new Client({
    node: node,
    auth: { apiKey: config.sourceApiKey },
    requestTimeout: requestTimeoutMs,
    tls: config.noVerifyCerts ? { rejectUnauthorized: false } : undefined,
  });
  return client;
}

function createDestClient(config) {
  var node = config.destHost.replace(/\/$/, '');
  var client = new Client({
    node: node,
    auth: { username: config.destUsername, password: config.destPassword },
    requestTimeout: requestTimeoutMs,
    tls: config.noVerifyCerts ? { rejectUnauthorized: false } : undefined,
  });
  return client;
}

function pingCluster(client, label, log) {
  return client
    .info()
    .then(function (info) {
      var name = (info.body ? info.body.cluster_name : info.cluster_name) || 'unknown';
      var version =
        (info.body
          ? info.body.version && info.body.version.number
          : info.version && info.version.number) || 'unknown';
      log('[' + label + '] Connected: ' + name + ' (' + version + ')');
    })
    .catch(function (err) {
      log('[' + label + '] Connection failed: ' + err.message);
      throw err;
    });
}

function search(sourceClient, config, cycleNumber, log, startTime, endTime) {
  var size = config.size;
  var indexPattern = config.indexPattern;

  var timeRange = {
    gte: startTime ? startTime.toISOString() : 'now-24h',
    lte: endTime ? endTime.toISOString() : 'now',
  };

  var query = {
    bool: {
      must: [{ match_all: {} }, { range: { '@timestamp': timeRange } }],
    },
  };

  var body;
  if (config.sampleMode === 'recent') {
    body = {
      query: query,
      sort: [{ '@timestamp': { order: 'desc' } }],
      size: size,
    };
  } else {
    var seed =
      config.randomSeed !== null ? config.randomSeed : (config.runSeed || Date.now()) + cycleNumber;
    body = {
      query: {
        function_score: {
          query: query,
          functions: [{ random_score: { seed: seed } }],
          score_mode: 'sum',
        },
      },
      size: size,
    };
  }

  return sourceClient
    .search({ index: indexPattern, body: body })
    .then(function (res) {
      var hits =
        (res.body && res.body.hits && res.body.hits.hits) || (res.hits && res.hits.hits) || [];
      return hits.map(function (hit) {
        var result = {
          _index: hit._index,
          _id: hit._id,
          _source: hit._source || {},
        };
        if (hit._score != null) {
          result._score = hit._score;
        }
        return result;
      });
    })
    .catch(function (err) {
      log('Search failed: ' + err.message);
      return [];
    });
}

// This cleanup is needed in the scenario where multiple data streams are being synced to the same index.
// As these fields are constant keywords in the data stream naming scheme, it would mean only documents
// with the same data stream fields would be accepted.
function stripDataStreamFields(doc) {
  var src = doc._source;
  if (!src || typeof src !== 'object') return;
  for (var key in src) {
    if (Object.prototype.hasOwnProperty.call(src, key)) {
      if (key.startsWith('data_stream.')) {
        delete src[key];
      }
    }
  }
}

function transform(docs, config, useFromToRange) {
  var sourceRangeStart;
  var sourceRange;
  var targetRange;

  if (config.translateTimestamps) {
    if (useFromToRange) {
      sourceRangeStart = parseDateAsUtc(config.from).getTime();
      sourceRange = parseDateAsUtc(config.to).getTime() - sourceRangeStart;
    } else {
      // This case is for default live mode (no from/to)
      sourceRange = 24 * 60 * 60 * 1000;
      sourceRangeStart = new Date().getTime() - sourceRange;
    }

    if (typeof config.translateTimestamps === 'number') {
      targetRange = config.translateTimestamps * 60 * 60 * 1000;
    } else {
      targetRange = sourceRange;
    }
  }

  // In live mode, all documents get the current time so they appear to arrive "now".
  var batchNowMs = config.translateTimestamps === 'live' ? new Date().getTime() : undefined;

  for (var i = 0; i < docs.length; i++) {
    var doc = docs[i];
    stripDataStreamFields(doc);
    if (config.targetIndex) {
      doc._index = config.targetIndex;
    }
    if (config.translateTimestamps && doc._source && doc._source['@timestamp']) {
      if (config.translateTimestamps === 'live' && batchNowMs !== undefined) {
        doc._source['@timestamp'] = new Date(batchNowMs).toISOString();
      } else if (sourceRange > 0) {
        var originalTimestampMs = new Date(doc._source['@timestamp']).getTime();
        var now = new Date().getTime();
        var targetEnd = now;
        var targetStart = targetEnd - targetRange;
        var clampedTimestampMs = Math.max(
          sourceRangeStart,
          Math.min(originalTimestampMs, sourceRangeStart + sourceRange)
        );
        var normalized = (clampedTimestampMs - sourceRangeStart) / sourceRange;
        var newTimestampMs = targetStart + normalized * targetRange;
        doc._source['@timestamp'] = new Date(newTimestampMs).toISOString();
      }
    }
  }
}

function backingIndexToStreamName(index) {
  if (typeof index !== 'string') return index;
  if (!index.startsWith('.ds-')) return index;
  var withoutPrefix = index.slice(4);
  var parts = withoutPrefix.split('-');
  if (parts.length >= 3) {
    return parts.slice(0, -2).join('-');
  }
  return index;
}

function ensureDataStreamExists(destClient, name, log) {
  return destClient.indices
    .getDataStream({ name: name })
    .then(function () {
      return true;
    })
    .catch(function (err) {
      if (err.meta && err.meta.statusCode === 404) {
        return destClient.indices
          .createDataStream({ name: name })
          .then(function () {
            log('Created data stream: ' + name);
            return true;
          })
          .catch(function (createErr) {
            log('Failed to create data stream ' + name + ': ' + createErr.message);
            return false;
          });
      }
      log('Failed to get data stream ' + name + ': ' + err.message);
      return false;
    });
}

function uploadDocumentsToStream(destClient, docs, targetStreamOrIndex, batchSize, log) {
  if (docs.length === 0) return Promise.resolve(0);

  return ensureDataStreamExists(destClient, targetStreamOrIndex, log).then(function (exists) {
    if (!exists) return 0;

    var totalUploaded = 0;
    var chain = Promise.resolve();

    var createBulkRequest = function (batch) {
      return function () {
        var operations = [];
        for (var j = 0; j < batch.length; j++) {
          var doc = batch[j];
          operations.push({ create: { _index: targetStreamOrIndex } });
          operations.push(doc._source || doc);
        }

        return destClient
          .bulk({
            operations: operations,
            refresh: false,
          })
          .then(function (response) {
            var res = response.body || response;
            if (res.errors) {
              var items = res.items || [];
              for (var k = 0; k < items.length; k++) {
                var item = items[k];
                var create = item.create;
                if (create && create.error) {
                  log(
                    'Bulk create error [' +
                      create._index +
                      '] (ES _id: ' +
                      (create._id || 'auto-generated') +
                      '): ' +
                      (create.error.reason || JSON.stringify(create.error))
                  );
                } else if (create) {
                  totalUploaded += 1;
                }
              }
            } else {
              totalUploaded += batch.length;
            }
          })
          .catch(function (err) {
            log('Bulk request failed: ' + err.message);
          });
      };
    };

    for (var i = 0; i < docs.length; i += batchSize) {
      var batch = docs.slice(i, i + batchSize);
      chain = chain.then(createBulkRequest(batch));
    }

    return chain.then(function () {
      return totalUploaded;
    });
  });
}

function runSyncCycle(
  sourceClient,
  destClient,
  config,
  cycleNumber,
  log,
  startTime,
  endTime,
  useFromToRange
) {
  return search(sourceClient, config, cycleNumber, log, startTime, endTime).then(function (docs) {
    if (docs.length === 0) return 0;

    transform(docs, config, useFromToRange);

    if (config.targetIndex) {
      return uploadDocumentsToStream(destClient, docs, config.targetIndex, config.batchSize, log);
    }

    var byStream = {};
    for (var i = 0; i < docs.length; i++) {
      var doc = docs[i];
      var streamName = backingIndexToStreamName(doc._index);
      if (!byStream[streamName]) byStream[streamName] = [];
      byStream[streamName].push(doc);
    }

    var total = 0;
    var streamPromises = [];
    Object.keys(byStream).forEach(function (streamName) {
      var groupDocs = byStream[streamName];
      streamPromises.push(
        uploadDocumentsToStream(destClient, groupDocs, streamName, config.batchSize, log).then(
          function (uploaded) {
            total += uploaded;
          }
        )
      );
    });

    return Promise.all(streamPromises).then(function () {
      return total;
    });
  });
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
  SYNC_FROM                    or  --from             Start of the time range for syncing (ISO 8601 format)
  SYNC_TO                      or  --to               End of the time range for syncing (ISO 8601 format)
  --translate-timestamps[=VAL] Translate log timestamps to a new time range ending at the present.
                               VAL can be:
                               - A number of hours to normalize to (e.g., 24).
                               - "live" to continuously sample from the --from/--to range and translate timestamps to now.
                               - If no value, preserves the original duration.
                               Requires --from and --to.

Other:
  --config, -c                 Path to Kibana config (default: config/kibana.dev.yml)
  --no-verify-certs            Disable TLS verification
  --verbose, -v                Verbose logging
  --help, -h                   This help
`);
}

function main() {
  var opts = getopts(process.argv.slice(2), {
    alias: { h: 'help', v: 'verbose' },
    boolean: ['help', 'verbose'],
  });
  if (opts.help) {
    showHelp();
    process.exit(0);
  }

  var config = parseConfig();
  var log = config.verbose
    ? function (msg) {
        console.log('[' + new Date().toISOString() + '] ' + msg);
      }
    : function (msg) {
        console.log(msg);
      };

  if (config.randomSeed === null) {
    config.runSeed = Date.now();
  }

  var sourceClient = createSourceClient(config);
  var destClient = createDestClient(config);

  var shutdownRequested = false;
  var onSignal = function () {
    shutdownRequested = true;
    log('Shutdown requested; finishing current cycle...');
  };
  process.on('SIGINT', onSignal);
  process.on('SIGTERM', onSignal);

  // Determine sync strategy
  var isLiveSampleMode = config.translateTimestamps === 'live' && config.from && config.to;
  var isHistoricalBackfillMode = config.from && config.to && !isLiveSampleMode;

  var cycle = 0;
  var historicalCycle = 0;

  function loop() {
    if (shutdownRequested) {
      log('Sync stopped.');
      process.exit(0);
      return;
    }
    cycle += 1;

    var startTime;
    var endTime;
    var useFromToRange = false;

    if (isLiveSampleMode) {
      startTime = parseDateAsUtc(config.from);
      endTime = parseDateAsUtc(config.to);
      useFromToRange = true;
    } else if (isHistoricalBackfillMode) {
      historicalCycle += 1;
      useFromToRange = true;
      var loopStartTime = parseDateAsUtc(config.from);
      var loopEndTime = parseDateAsUtc(config.to);
      var currentSyncTime = new Date(
        loopStartTime.getTime() + (historicalCycle - 1) * config.intervalSeconds * 1000
      );

      if (currentSyncTime >= loopEndTime) {
        log('Sync finished for the specified time range.');
        process.exit(0);
        return;
      }
      startTime = currentSyncTime;
      endTime = new Date(currentSyncTime.getTime() + config.intervalSeconds * 1000);
      if (endTime > loopEndTime) {
        endTime = loopEndTime;
      }
    }
    // Default live mode (no from/to) uses undefined startTime/endTime

    runSyncCycle(sourceClient, destClient, config, cycle, log, startTime, endTime, useFromToRange)
      .then(function (pushed) {
        var timeInfo = '';
        if (startTime && endTime) {
          timeInfo = ' for ' + startTime.toISOString() + ' to ' + endTime.toISOString();
        }
        log('Cycle ' + cycle + ': pushed ' + pushed + ' documents' + timeInfo);

        if (shutdownRequested) {
          log('Sync stopped.');
          process.exit(0);
        } else {
          if (isHistoricalBackfillMode) {
            loop(); // Run next backfill cycle immediately
          } else {
            setTimeout(loop, config.intervalSeconds * 1000); // Wait for interval
          }
        }
      })
      .catch(function (err) {
        log('Cycle ' + cycle + ' failed: ' + err.message);
        if (shutdownRequested) {
          log('Sync stopped.');
          process.exit(0);
        } else {
          if (isHistoricalBackfillMode) {
            loop();
          } else {
            setTimeout(loop, config.intervalSeconds * 1000);
          }
        }
      });
  }

  pingCluster(sourceClient, 'source', log)
    .then(function () {
      return pingCluster(destClient, 'dest', log);
    })
    .then(function () {
      loop();
    })
    .catch(function (err) {
      console.error('Fatal:', err);
      process.exit(1);
    });
}

if (require.main === module) {
  main();
}

module.exports = {
  parseConfig: parseConfig,
  createSourceClient: createSourceClient,
  createDestClient: createDestClient,
  search: search,
  transform: transform,
  backingIndexToStreamName: backingIndexToStreamName,
  uploadDocumentsToStream: uploadDocumentsToStream,
  runSyncCycle: runSyncCycle,
};
