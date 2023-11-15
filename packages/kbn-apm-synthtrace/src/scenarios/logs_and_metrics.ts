/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import {
  LogDocument,
  log,
  generateShortId,
  generateLongId,
  apm,
  Instance,
} from '@kbn/apm-synthtrace-client';
import { Scenario } from '../cli/scenario';
import { withClient } from '../lib/utils/with_client';
import { getSynthtraceEnvironment } from '../lib/utils/get_synthtrace_environment';

const ENVIRONMENT = getSynthtraceEnvironment(__filename);

const scenario: Scenario<LogDocument> = async (runOptions) => {
  return {
    generate: ({ range, clients: { logsEsClient, apmEsClient } }) => {
      const { numServices = 3 } = runOptions.scenarioOpts || {};
      const { logger } = runOptions;

      // Logs Data logic
      const MESSAGE_LOG_LEVELS = [
        { message: 'A simple log', level: 'info' },
        { message: 'Yet another debug log', level: 'debug' },
        { message: 'Error with certificate: "ca_trusted_fingerprint"', level: 'error' },
      ];
      const CLOUD_PROVIDERS = ['gcp', 'aws', 'azure'];
      const CLOUD_REGION = ['eu-central-1', 'us-east-1', 'area-51'];

      const CLUSTER = [
        { clusterId: generateShortId(), clusterName: 'synth-cluster-1' },
        { clusterId: generateShortId(), clusterName: 'synth-cluster-2' },
        { clusterId: generateShortId(), clusterName: 'synth-cluster-3' },
      ];

      const SERVICE_NAMES = Array(3)
        .fill(null)
        .map((_, idx) => `synth-service-${idx}`);

      const logs = range
        .interval('1m')
        .rate(1)
        .generator((timestamp) => {
          return Array(20)
            .fill(0)
            .map(() => {
              const index = Math.floor(Math.random() * 3);
              return log
                .create()
                .message(MESSAGE_LOG_LEVELS[index].message)
                .logLevel(MESSAGE_LOG_LEVELS[index].level)
                .service(SERVICE_NAMES[index])
                .defaults({
                  'trace.id': generateShortId(),
                  'agent.name': 'synth-agent',
                  'orchestrator.cluster.name': CLUSTER[index].clusterName,
                  'orchestrator.cluster.id': CLUSTER[index].clusterId,
                  'orchestrator.resource.id': generateShortId(),
                  'cloud.provider': CLOUD_PROVIDERS[Math.floor(Math.random() * 3)],
                  'cloud.region': CLOUD_REGION[index],
                  'cloud.availability_zone': `${CLOUD_REGION[index]}a`,
                  'cloud.project.id': generateShortId(),
                  'cloud.instance.id': generateShortId(),
                  'log.file.path': `/logs/${generateLongId()}/error.txt`,
                })
                .timestamp(timestamp);
            });
        });

      // APM Simple Trace

      const transactionName = '240rpm/75% 1000ms';

      const successfulTimestamps = range.interval('1m').rate(180);
      const failedTimestamps = range.interval('1m').rate(180);

      const instances = [...Array(numServices).keys()].map((index) =>
        apm
          .service({ name: SERVICE_NAMES[index], environment: ENVIRONMENT, agentName: 'go' })
          .instance('instance')
      );
      const instanceSpans = (instance: Instance) => {
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

        const metricsets = range
          .interval('30s')
          .rate(1)
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

      return [
        withClient(
          logsEsClient,
          logger.perf('generating_logs', () => logs)
        ),
        withClient(
          apmEsClient,
          logger.perf('generating_apm_events', () =>
            instances.flatMap((instance) => instanceSpans(instance))
          )
        ),
      ];
    },
  };
};

export default scenario;
