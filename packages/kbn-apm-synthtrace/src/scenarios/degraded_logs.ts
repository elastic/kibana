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
import { IndexTemplateName } from '../lib/logs/custom_logsdb_index_templates';
import { withClient } from '../lib/utils/with_client';
import {
  getServiceName,
  getCluster,
  getCloudRegion,
  getCloudProvider,
} from './helpers/logs_mock_data';
import { parseLogsScenarioOpts } from './helpers/logs_scenario_opts_parser';

const MORE_THAN_1024_CHARS =
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem. Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam, nisi ut aliquid ex ea commodi consequatur? Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur, vel illum qui dolorem eum fugiat quo voluptas nulla pariatur?';

// Logs Data logic
const MESSAGE_LOG_LEVELS = [
  { message: 'A simple log', level: 'info' },
  {
    message: 'Another log message',
    level: 'debug',
  },
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

      const constructLogsCommonData = () => {
        const index = Math.floor(Math.random() * 3);
        const serviceName = getServiceName(index);
        const logMessage = MESSAGE_LOG_LEVELS[index];
        const { clusterId, clusterName } = getCluster(index);
        const cloudRegion = getCloudRegion(index);

        const commonLongEntryFields: LogDocument = {
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
        };

        return {
          index,
          serviceName,
          logMessage,
          cloudRegion,
          commonLongEntryFields,
        };
      };

      const datasetSynth1Logs = (timestamp: number) => {
        const {
          serviceName,
          logMessage: { level, message },
          commonLongEntryFields,
        } = constructLogsCommonData();

        return log
          .create({ isLogsDb })
          .dataset('synth.1')
          .message(message)
          .logLevel(level)
          .service(serviceName)
          .defaults(commonLongEntryFields)
          .timestamp(timestamp);
      };

      const datasetSynth2Logs = (i: number, timestamp: number) => {
        const {
          serviceName,
          logMessage: { level, message },
          commonLongEntryFields,
        } = constructLogsCommonData();
        const isMalformed = i % 60 === 0;
        return log
          .create({ isLogsDb })
          .dataset('synth.2')
          .message(message)
          .logLevel(isMalformed ? MORE_THAN_1024_CHARS : level) // "ignore_above": 1024 in mapping
          .service(serviceName)
          .defaults(commonLongEntryFields)
          .timestamp(timestamp);
      };

      const datasetSynth3Logs = (i: number, timestamp: number) => {
        const {
          serviceName,
          logMessage: { level, message },
          cloudRegion,
          commonLongEntryFields,
        } = constructLogsCommonData();
        const isMalformed = i % 10 === 0;
        return log
          .create({ isLogsDb })
          .dataset('synth.3')
          .message(message)
          .logLevel(isMalformed ? MORE_THAN_1024_CHARS : level) // "ignore_above": 1024 in mapping
          .service(serviceName)
          .defaults({
            ...commonLongEntryFields,
            'cloud.availability_zone': isMalformed
              ? MORE_THAN_1024_CHARS // "ignore_above": 1024 in mapping
              : `${cloudRegion}a`,
          })
          .timestamp(timestamp);
      };

      const logs = range
        .interval('1m')
        .rate(1)
        .generator((timestamp) => {
          return Array(200)
            .fill(0)
            .flatMap((_, index) => [
              datasetSynth1Logs(timestamp),
              datasetSynth2Logs(index, timestamp),
              datasetSynth3Logs(index, timestamp),
            ]);
        });

      return withClient(
        logsEsClient,
        logger.perf('generating_logs', () => logs)
      );
    },
  };
};

export default scenario;
