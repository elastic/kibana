/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { LogDocument, generateLongId, generateShortId, log } from '@kbn/apm-synthtrace-client';
import { Scenario } from '../cli/scenario';
import { IndexTemplateName } from '../lib/logs/custom_logsdb_index_templates';
import { LogsCustom } from '../lib/logs/logs_synthtrace_es_client';
import { withClient } from '../lib/utils/with_client';
import {
  MORE_THAN_1024_CHARS,
  getCloudProvider,
  getCloudRegion,
  getCluster,
  getServiceName,
} from './helpers/logs_mock_data';
import { parseLogsScenarioOpts } from './helpers/logs_scenario_opts_parser';

const processors = [
  {
    script: {
      tag: 'normalize log level',
      lang: 'painless',
      source: `
        String level = ctx['log.level'];
        if ('0'.equals(level)) {
          ctx['log.level'] = 'info';
        } else if ('1'.equals(level)) {
          ctx['log.level'] = 'debug';
        } else if ('2'.equals(level)) {
          ctx['log.level'] = 'warning';
        } else if ('3'.equals(level)) {
          ctx['log.level'] = 'error';
        } else {
          throw new Exception("Not a valid log level");
        }
      `,
    },
  },
];

// Logs Data logic
const MESSAGE_LOG_LEVELS = [
  { message: 'A simple log', level: '0' },
  {
    message: 'Another log message',
    level: '1',
  },
  {
    message: 'A log message generated from a warning',
    level: '2',
  },
  { message: 'Error with certificate: "ca_trusted_fingerprint"', level: '3' },
];

const scenario: Scenario<LogDocument> = async (runOptions) => {
  const { isLogsDb } = parseLogsScenarioOpts(runOptions.scenarioOpts);

  return {
    bootstrap: async ({ logsEsClient }) => {
      await logsEsClient.createCustomPipeline(processors);
      if (isLogsDb) await logsEsClient.createIndexTemplate(IndexTemplateName.LogsDb);

      await logsEsClient.createComponentTemplate({
        name: LogsCustom,
        dataStreamOptions: {
          failure_store: {
            enabled: true,
          },
        },
      });
    },
    teardown: async ({ logsEsClient }) => {
      await logsEsClient.deleteComponentTemplate(LogsCustom);
      await logsEsClient.deleteCustomPipeline();
      if (isLogsDb) await logsEsClient.deleteIndexTemplate(IndexTemplateName.LogsDb);
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
        const isFailed = i % 60 === 0;
        return log
          .create({ isLogsDb })
          .dataset('synth.2')
          .message(message)
          .logLevel(isFailed ? '4' : level) // "script_exception": Not a valid log level
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
        const isFailed = i % 80 === 0;
        return log
          .create({ isLogsDb })
          .dataset('synth.3')
          .message(message)
          .logLevel(isFailed ? '5' : level) // "script_exception": Not a valid log level
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
