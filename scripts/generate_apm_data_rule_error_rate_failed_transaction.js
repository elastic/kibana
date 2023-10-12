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
const { getKibanaClient } = require('@kbn/apm-synthtrace/src/cli/utils/get_kibana_client');
const { getServiceUrls } = require('@kbn/apm-synthtrace/src/cli/utils/get_service_urls');

const { createLogger } = require('@kbn/apm-synthtrace');
const { apm, timerange } = require('@kbn/apm-synthtrace-client');

const generateApmData = async () => {
  const logger = createLogger(2);

  const { kibanaUrl, esUrl } = await getServiceUrls({ logger });
  const kibanaClient = getKibanaClient({
    target: kibanaUrl,
    logger,
  });

  const latestPackageVersion = await kibanaClient.fetchLatestApmPackageVersion();

  const synthtraceEsClient = getEsClient({
    target: 'http://elastic:changeme@127.0.0.1:9200/',
    logger,
    concurrency: 1,
    version: latestPackageVersion,
  });

  console.log(latestPackageVersion, '!!latestPackageVersion');
  await kibanaClient.installApmPackage(latestPackageVersion);

  const opbeansJava = apm
    .service({ name: 'opbeans-java-rule-test', environment: 'rule-test', agentName: 'java' })
    .instance('instance');

  const opbeansPhp = apm
    .service({ name: 'opbeans-php-rule-test', environment: 'rule-test', agentName: 'php' })
    .instance('instance');

  const opbeansNode = apm
    .service({ name: 'opbeans-node-rule-test', environment: 'rule-test', agentName: 'node' })
    .instance('instance');

  const good_events = timerange('now-1d', 'now')
    .ratePerMinute(1)
    .generator((timestamp) => {
      return [
        opbeansJava
          .transaction({ transactionName: 'tx-java' })
          .timestamp(timestamp)
          .duration(100)
          .success(),

        opbeansNode
          .transaction({ transactionName: 'tx-node' })
          .timestamp(timestamp)
          .duration(100)
          .success(),

        opbeansPhp
          .transaction({ transactionName: 'tx-php' })
          .timestamp(timestamp)
          .duration(100)
          .success(),
      ];
    });

  const error_events_rpm1 = timerange('now-15m', 'now+15m')
    .ratePerMinute(1)
    .generator((timestamp) => {
      return [
        opbeansJava
          .transaction({ transactionName: 'tx-java' })
          .timestamp(timestamp)
          .duration(300)
          .failure()
          .errors(opbeansJava.error({ message: 'a java error' }).timestamp(timestamp)),

        opbeansNode
          .transaction({ transactionName: 'tx-node' })
          .timestamp(timestamp)
          .duration(100)
          .failure()
          .errors(opbeansNode.error({ message: 'a node error' }).timestamp(timestamp)),
      ];
    });

  const error_events_rpm2 = timerange('now-15m', 'now+15m')
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

  const transactionName = '240rpm/75% 1000ms';

  const successfulTimestamps = timerange('now-15m', 'now+15m').ratePerMinute(180);
  const failedTimestamps = timerange('now-15m', 'now+15m').ratePerMinute(180);

  const instances = [...Array(3).keys()].map((index) =>
    apm
      .service({ name: `synth-go-${index}`, environment: `ENVIRONMENT`, agentName: 'go' })
      .instance('instance')
  );
  const instanceSpans = (instance) => {
    const successfulTraceEvents = successfulTimestamps.generator((timestamp) =>
      instance
        .transaction({ transactionName })
        .timestamp(timestamp)
        .duration(1000)
        .success()
        .children(
          instance
            .span({
              spanName: 'GET apm-*/_search',
              spanType: 'db',
              spanSubtype: 'elasticsearch',
            })
            .duration(1000)
            .success()
            .destination('elasticsearch')
            .timestamp(timestamp),
          instance
            .span({ spanName: 'custom_operation', spanType: 'custom' })
            .duration(100)
            .success()
            .timestamp(timestamp)
        )
    );

    const failedTraceEvents = failedTimestamps.generator((timestamp) =>
      instance
        .transaction({ transactionName })
        .timestamp(timestamp)
        .duration(1000)
        .failure()
        .errors(
          instance
            .error({ message: '[ResponseError] index_not_found_exception' })
            .timestamp(timestamp + 50)
        )
    );

    const metricsets = timerange('now-15m', 'now+15m')
      .ratePerMinute(1)
      .generator((timestamp) =>
        instance
          .appMetrics({
            'system.memory.actual.free': 800,
            'system.memory.total': 1000,
            'system.cpu.total.norm.pct': 0.6,
            'system.process.cpu.total.norm.pct': 0.7,
          })
          .timestamp(timestamp)
      );

    return [successfulTraceEvents, failedTraceEvents, metricsets];
  };

  await Promise.all([
    synthtraceEsClient.index(good_events),
    synthtraceEsClient.index(error_events_rpm1),
    synthtraceEsClient.index(error_events_rpm2),
    synthtraceEsClient.index(instances.flatMap((instance) => instanceSpans(instance))),
  ]);
};

generateApmData();
