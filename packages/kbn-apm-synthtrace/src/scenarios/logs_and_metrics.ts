/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
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
import { parseLogsScenarioOpts } from './helpers/logs_scenario_opts_parser';
import { IndexTemplateName } from '../lib/logs/custom_logsdb_index_templates';
import { getCluster, getCloudRegion, getCloudProvider } from './helpers/logs_mock_data';

const ENVIRONMENT = getSynthtraceEnvironment(__filename);

// Logs Data logic
const MESSAGE_LOG_LEVELS = [
  { message: 'A simple log', level: 'info' },
  { message: 'Yet another debug log', level: 'debug' },
  { message: 'Error with certificate: "ca_trusted_fingerprint"', level: 'error' },
];

const scenario: Scenario<LogDocument> = async (runOptions) => {
  const { isLogsDb } = parseLogsScenarioOpts(runOptions.scenarioOpts);

  return {
    bootstrap: async ({ logsEsClient }) => {
      if (isLogsDb) await logsEsClient.createIndexTemplate(IndexTemplateName.LogsDb);
    },
    teardown: async ({ logsEsClient }) => {
      await logsEsClient.deleteIndexTemplate(IndexTemplateName.LogsDb);
    },
    generate: ({ range, clients: { logsEsClient, apmEsClient } }) => {
      const { numServices = 3 } = runOptions.scenarioOpts || {};
      const { logger } = runOptions;

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
              const { clusterId, clusterName } = getCluster(index);
              const cloudRegion = getCloudRegion(index);
              return log
                .create({ isLogsDb })
                .message(MESSAGE_LOG_LEVELS[index].message)
                .logLevel(MESSAGE_LOG_LEVELS[index].level)
                .service(SERVICE_NAMES[index])
                .defaults({
                  'trace.id': generateShortId(),
                  'agent.name': 'synth-agent',
                  'orchestrator.cluster.name': clusterName,
                  'orchestrator.cluster.id': clusterId,
                  'orchestrator.resource.id': generateShortId(),
                  'cloud.provider': getCloudProvider(),
                  'cloud.region': cloudRegion,
                  'cloud.availability_zone': `${cloudRegion}a`,
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
                .error({
                  message: '[ResponseError] index_not_found_exception',
                  type: 'ResponseError',
                })
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
