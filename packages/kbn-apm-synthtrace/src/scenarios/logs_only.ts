/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { LogDocument, log, generateShortId, generateLongId } from '@kbn/apm-synthtrace-client';
import { Scenario } from '../cli/scenario';
import { withClient } from '../lib/utils/with_client';
import { parseLogsScenarioOpts } from './helpers/logs_scenario_opts_parser';
import { IndexTemplateName } from '../lib/logs/custom_logsdb_index_templates';
import { getCluster, getCloudRegion, getCloudProvider } from './helpers/logs_mock_data';

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
    generate: ({ range, clients: { logsEsClient } }) => {
      const { logger } = runOptions;

      const SERVICE_NAMES = Array(3)
        .fill(null)
        .map((_, idx) => `synth-service-logs-${idx}`);

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

      return [
        withClient(
          logsEsClient,
          logger.perf('generating_logs', () => logs)
        ),
      ];
    },
  };
};

export default scenario;
