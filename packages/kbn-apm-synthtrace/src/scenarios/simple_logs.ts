/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { LogDocument, log, generateShortId, generateLongId } from '@kbn/apm-synthtrace-client';
import moment from 'moment';
import { Scenario } from '../cli/scenario';
import { IndexTemplateName } from '../lib/logs/custom_logsdb_index_templates';
import { withClient } from '../lib/utils/with_client';
import {
  getServiceName,
  getGeoCoordinate,
  getIpAddress,
  getCluster,
  getCloudProvider,
  getCloudRegion,
} from './helpers/logs_mock_data';
import { parseLogsScenarioOpts } from './helpers/logs_scenario_opts_parser';

// Logs Data logic
const MESSAGE_LOG_LEVELS = [
  { message: 'A simple log with something random <random> in the middle', level: 'info' },
  { message: 'Yet another debug log', level: 'debug' },
  { message: 'Error with certificate: "ca_trusted_fingerprint"', level: 'error' },
];

const MORE_THAN_1024_CHARS =
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem. Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam, nisi ut aliquid ex ea commodi consequatur? Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur, vel illum qui dolorem eum fugiat quo voluptas nulla pariatur?';

const scenario: Scenario<LogDocument> = async (runOptions) => {
  const { isLogsDb } = parseLogsScenarioOpts(runOptions.scenarioOpts);

  const constructLogsCommonData = () => {
    const index = Math.floor(Math.random() * 3);
    const serviceName = getServiceName(index);
    const logMessage = MESSAGE_LOG_LEVELS[index];
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
    };

    return {
      index,
      serviceName,
      logMessage,
      cloudRegion,
      commonLongEntryFields,
    };
  };

  return {
    bootstrap: async ({ logsEsClient }) => {
      if (isLogsDb) await logsEsClient.createIndexTemplate(IndexTemplateName.LogsDb);
    },
    generate: ({ range, clients: { logsEsClient } }) => {
      const { logger } = runOptions;

      const logs = range
        .interval('1m')
        .rate(1)
        .generator((timestamp) => {
          return Array(3)
            .fill(0)
            .map(() => {
              const {
                serviceName,
                logMessage: { level, message },
                commonLongEntryFields,
              } = constructLogsCommonData();

              return log
                .create({ isLogsDb })
                .message(message.replace('<random>', generateShortId()))
                .logLevel(level)
                .service(serviceName)
                .setGeoLocation(getGeoCoordinate())
                .setHostIp(getIpAddress())
                .defaults(commonLongEntryFields)
                .timestamp(timestamp);
            });
        });

      const logsWithNoLogLevel = range
        .interval('1m')
        .rate(1)
        .generator((timestamp) => {
          return Array(3)
            .fill(0)
            .map(() => {
              const {
                serviceName,
                logMessage: { message },
                commonLongEntryFields,
              } = constructLogsCommonData();

              return log
                .create({ isLogsDb })
                .service(serviceName)
                .setGeoLocation(getGeoCoordinate())
                .setHostIp(getIpAddress())
                .defaults({
                  ...commonLongEntryFields,
                  'error.message': message,
                })
                .timestamp(timestamp);
            });
        });

      const logsWithErrorMessage = range
        .interval('1m')
        .rate(1)
        .generator((timestamp) => {
          return Array(3)
            .fill(0)
            .map(() => {
              const {
                serviceName,
                logMessage: { level, message },
                commonLongEntryFields,
              } = constructLogsCommonData();

              return log
                .create({ isLogsDb })
                .logLevel(level)
                .service(serviceName)
                .setGeoLocation(getGeoCoordinate())
                .setHostIp(getIpAddress())
                .defaults({
                  ...commonLongEntryFields,
                  'error.message': message,
                  'error.exception.stacktrace': 'Error message in error.exception.stacktrace',
                })
                .timestamp(timestamp);
            });
        });

      const logsWithEventMessage = range
        .interval('1m')
        .rate(1)
        .generator((timestamp) => {
          return Array(3)
            .fill(0)
            .map(() => {
              const {
                serviceName,
                logMessage: { level, message },
                commonLongEntryFields,
              } = constructLogsCommonData();

              const eventDate = moment().toDate();

              return log
                .create({ isLogsDb })
                .logLevel(level)
                .service(serviceName)
                .setGeoLocation(getGeoCoordinate())
                .setHostIp(getIpAddress())
                .defaults({
                  ...commonLongEntryFields,
                  'event.original': message,
                  'error.log.stacktrace': 'Error message in error.log.stacktrace',
                  'event.start': eventDate,
                  'event.end': moment(eventDate).add(1, 'm').toDate(),
                })
                .timestamp(timestamp);
            });
        });

      const logsWithNoMessage = range
        .interval('1m')
        .rate(1)
        .generator((timestamp) => {
          return Array(3)
            .fill(0)
            .map(() => {
              const {
                serviceName,
                logMessage: { level },
                commonLongEntryFields,
              } = constructLogsCommonData();

              return log
                .create({ isLogsDb })
                .logLevel(level)
                .service(serviceName)
                .setGeoLocation(getGeoCoordinate())
                .setHostIp(getIpAddress())
                .defaults({
                  ...commonLongEntryFields,
                  'error.stack_trace': 'Error message in error.stack_trace',
                })
                .timestamp(timestamp);
            });
        });

      const malformedDocs = range
        .interval('1m')
        .rate(1)
        .generator((timestamp) => {
          return Array(3)
            .fill(0)
            .map(() => {
              const {
                serviceName,
                logMessage: { message },
                cloudRegion,
                commonLongEntryFields,
              } = constructLogsCommonData();

              return log
                .create({ isLogsDb })
                .message(message)
                .logLevel(MORE_THAN_1024_CHARS)
                .setGeoLocation(getGeoCoordinate())
                .setHostIp(getIpAddress())
                .service(serviceName)
                .defaults({
                  ...commonLongEntryFields,
                  'cloud.region': cloudRegion,
                  'cloud.availability_zone': MORE_THAN_1024_CHARS,
                })
                .timestamp(timestamp);
            });
        });

      return withClient(
        logsEsClient,
        logger.perf('generating_logs', () => [
          logs,
          logsWithNoLogLevel,
          logsWithErrorMessage,
          logsWithEventMessage,
          logsWithNoMessage,
          malformedDocs,
        ])
      );
    },
  };
};

export default scenario;
