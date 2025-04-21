/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  OtelLogDocument,
  generateLongId,
  generateShortId,
  otelLog,
} from '@kbn/apm-synthtrace-client';
import moment from 'moment';
import { Scenario } from '../cli/scenario';
import { withClient } from '../lib/utils/with_client';
import {
  MORE_THAN_1024_CHARS,
  getCloudProvider,
  getCloudRegion,
  getCluster,
  getIpAddress,
  getServiceName,
} from './helpers/logs_mock_data';

// Logs Data logic
const MESSAGE_LOG_LEVELS = [
  { message: 'A simple log with something random <random> in the middle', level: 'info' },
  { message: 'Yet another debug log', level: 'debug' },
  { message: 'Error with certificate: "ca_trusted_fingerprint"', level: 'error' },
];

const scenario: Scenario<OtelLogDocument> = async (runOptions) => {
  const constructLogsCommonData = () => {
    const index = Math.floor(Math.random() * 3);
    const serviceName = getServiceName(index);
    const logMessage = MESSAGE_LOG_LEVELS[index];
    const { clusterId, clusterName, namespace } = getCluster(index);
    const cloudRegion = getCloudRegion(index);

    const commonLongEntryFields: OtelLogDocument = {
      trace_id: generateLongId(),
      resource: {
        attributes: {
          'service.name': serviceName,
          'service.version': '1.0.0',
          'service.environment': 'production',
          'k8s.cluster.name': clusterName,
          'k8s.cluster.id': clusterId,
          'k8s.namespace.name': namespace,
          'k8s.pod.name': `${serviceName}-${generateShortId()}`,
          'cloud.provider': getCloudProvider(),
          'cloud.region': cloudRegion,
          'cloud.availability_zone': `${cloudRegion}a`,
          'cloud.account.id': generateShortId(),
          'cloud.resource_id': generateShortId(),
        },
      },
      attributes: {
        'log.file.path': `/logs/${generateLongId()}/error.txt`,
      },
    };

    return {
      index,
      logMessage,
      commonLongEntryFields,
    };
  };

  return {
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
                logMessage: { level, message },
                commonLongEntryFields,
              } = constructLogsCommonData();

              return otelLog
                .create()
                .message(message.replace('<random>', generateShortId()))
                .logLevel(level)
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
                logMessage: { message },
                commonLongEntryFields,
              } = constructLogsCommonData();

              return otelLog
                .create()
                .message(message)
                .setHostIp(getIpAddress())
                .defaults({
                  ...commonLongEntryFields,
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
                logMessage: { level, message },
                commonLongEntryFields,
              } = constructLogsCommonData();

              return otelLog
                .create()
                .logLevel(level)
                .setHostIp(getIpAddress())
                .defaults({
                  ...commonLongEntryFields,
                })
                .addAttributes({
                  'error.message': message,
                  'error.stack_trace': 'Stacktrace',
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
                logMessage: { level, message },
                commonLongEntryFields,
              } = constructLogsCommonData();

              const eventDate = moment().toDate();

              return otelLog
                .create()
                .logLevel(level)
                .message(message)
                .setHostIp(getIpAddress())
                .defaults({
                  ...commonLongEntryFields,
                })
                .addAttributes({
                  'error.stack_trace': 'Stacktrace',
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
                logMessage: { level },
                commonLongEntryFields,
              } = constructLogsCommonData();

              return otelLog
                .create()
                .logLevel(level)
                .setHostIp(getIpAddress())
                .defaults({
                  ...commonLongEntryFields,
                })
                .addAttributes({
                  'error.stack_trace': 'Stacktrace',
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
                logMessage: { message },
                commonLongEntryFields,
              } = constructLogsCommonData();

              return otelLog
                .create()
                .message(message)
                .defaults({
                  ...commonLongEntryFields,
                })
                .addResourceAttributes({
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
