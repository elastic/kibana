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
  LONG_FIELD_NAME,
} from '@kbn/apm-synthtrace-client';
import moment from 'moment';
import { Scenario } from '../cli/scenario';
import { IndexTemplateName } from '../lib/logs/custom_logsdb_index_templates';
import { withClient } from '../lib/utils/with_client';
import {
  getServiceName,
  getCluster,
  getCloudProvider,
  getCloudRegion,
} from './helpers/logs_mock_data';
import { parseLogsScenarioOpts } from './helpers/logs_scenario_opts_parser';
import { timestampDateMapping } from '../lib/logs/custom_logsdb_indices';

// Logs Data logic
const MESSAGE_LOG_LEVELS = [
  { message: 'A simple log with something random <random> in the middle', level: 'info' },
  { message: 'Yet another debug log', level: 'debug' },
  { message: 'Error with certificate: "ca_trusted_fingerprint"', level: 'error' },
];

const scenario: Scenario<LogDocument> = async (runOptions) => {
  const { isLogsDb } = parseLogsScenarioOpts(runOptions.scenarioOpts);

  const constructLogsCommonData = () => {
    const index = Math.floor(Math.random() * 3);
    const serviceName = getServiceName(index);
    const { message, level } = MESSAGE_LOG_LEVELS[index];
    const { clusterId, clusterName, namespace } = getCluster(index);
    const cloudRegion = getCloudRegion(index);

    const commonLongEntryFields: LogDocument = {
      'trace.id': generateShortId(),
      'agent.name': 'nodejs',
      'orchestrator.cluster.name': clusterName,
      'orchestrator.cluster.id': clusterId,
      'orchestrator.namespace': namespace,
      'container.name': `${serviceName}-${generateShortId()}`,
      'orchestrator.resource.id': generateShortId(),
      'cloud.provider': getCloudProvider(),
      'cloud.region': cloudRegion,
      'cloud.availability_zone': `${cloudRegion}a`,
      'cloud.project.id': generateShortId(),
      'cloud.instance.id': generateShortId(),
      'log.file.path': `/logs/${generateLongId()}/error.txt`,
      severity: level,
      svc: serviceName,
      msg: message.replace('<random>', generateShortId()),
      [LONG_FIELD_NAME]: 'test',
    };

    return {
      index,
      serviceName,
      cloudRegion,
      commonLongEntryFields,
    };
  };

  return {
    bootstrap: async ({ logsEsClient }) => {
      await logsEsClient.createIndex('cloud-logs-synth.1-default', timestampDateMapping);
      await logsEsClient.createIndex('cloud-logs-synth.2-default');
      if (isLogsDb) await logsEsClient.createIndexTemplate(IndexTemplateName.LogsDb);
    },
    teardown: async ({ logsEsClient }) => {
      await logsEsClient.deleteIndexTemplate(IndexTemplateName.LogsDb);
    },
    generate: ({ range, clients: { logsEsClient } }) => {
      const { logger } = runOptions;

      const logsWithNonEcsFields = range
        .interval('1m')
        .rate(1)
        .generator((timestamp) => {
          return Array(3)
            .fill(0)
            .map(() => {
              const { commonLongEntryFields } = constructLogsCommonData();

              return log
                .create({ isLogsDb })
                .deleteField('host.name')
                .defaults({
                  ...commonLongEntryFields,
                  hostname: 'synth-host',
                })
                .dataset('custom.synth')
                .timestamp(timestamp);
            });
        });

      const logsOutsideDsnsWithTimestamp = range
        .interval('1m')
        .rate(1)
        .generator((timestamp) => {
          return Array(3)
            .fill(0)
            .map(() => {
              const { commonLongEntryFields } = constructLogsCommonData();

              return log
                .create({ isLogsDb })
                .deleteField('host.name')
                .deleteField('data_stream.type')
                .defaults({
                  ...commonLongEntryFields,
                  'data_stream.type': 'cloud-logs',
                  hostname: 'synth-host1',
                })
                .dataset('synth.1')
                .timestamp(timestamp);
            });
        });

      const logsOutsideDsnsWithoutTimestamp = range
        .interval('1m')
        .rate(1)
        .generator((timestamp) => {
          return Array(3)
            .fill(0)
            .map(() => {
              const { commonLongEntryFields } = constructLogsCommonData();

              return log
                .create({ isLogsDb })
                .deleteField('host.name')
                .deleteField('data_stream.type')
                .defaults({
                  ...commonLongEntryFields,
                  hostname: 'synth-host2',
                  'data_stream.type': 'cloud-logs',
                  date: moment(timestamp).toDate(),
                })
                .dataset('synth.2');
            });
        });

      return withClient(
        logsEsClient,
        logger.perf('generating_logs', () => [
          logsWithNonEcsFields,
          logsOutsideDsnsWithTimestamp,
          logsOutsideDsnsWithoutTimestamp,
        ])
      );
    },
  };
};

export default scenario;
