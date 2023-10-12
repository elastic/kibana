/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

require('@babel/register')({
  extensions: ['.ts', '.js'],
  presets: [['@babel/preset-env', { targets: { node: 'current' } }], '@babel/preset-typescript'],
});

const { getEsClient } = require('@kbn/apm-synthtrace/src/cli/utils/get_es_client');
const { createLogger } = require('@kbn/apm-synthtrace');
const { apm, timerange } = require('@kbn/apm-synthtrace-client');

const generateApmData = async () => {
  const logger = createLogger(2);
  const synthtraceEsClient = getEsClient({
    target: 'http://elastic:changeme@127.0.0.1:9200/',
    logger,
    concurrency: 1,
    version: '8.12.0-preview-1696560930',
  });
  const opbeansJava = apm
    .service({ name: 'opbeans-java', environment: 'production', agentName: 'java' })
    .instance('instance');

  const opbeansPhp = apm
    .service({ name: 'opbeans-php', environment: 'production', agentName: 'php' })
    .instance('instance');

  const opbeansNode = apm
    .service({ name: 'opbeans-node', environment: 'production', agentName: 'node' })
    .instance('instance');

  const events = timerange('now-15m', 'now')
    .ratePerMinute(1)
    .generator((timestamp) => {
      return [
        opbeansJava
          .transaction({ transactionName: 'tx-java' })
          .timestamp(timestamp)
          .duration(100)
          .failure()
          .errors(opbeansJava.error({ message: 'a java error' }).timestamp(timestamp + 50)),

        opbeansNode
          .transaction({ transactionName: 'tx-node' })
          .timestamp(timestamp)
          .duration(100)
          .success(),
      ];
    });

  const phpEvents = timerange('now-15m', 'now')
    .ratePerMinute(2)
    .generator((timestamp) => {
      return [
        opbeansPhp
          .transaction({ transactionName: 'tx-php' })
          .timestamp(timestamp)
          .duration(100)
          .failure()
          .errors(opbeansPhp.error({ message: 'a php error' }).timestamp(timestamp + 50)),
      ];
    });

  await Promise.all([synthtraceEsClient.index(events), synthtraceEsClient.index(phpEvents)]);
};

generateApmData();
