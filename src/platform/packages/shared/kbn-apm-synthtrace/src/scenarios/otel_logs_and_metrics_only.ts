/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { log, generateShortId } from '@kbn/apm-synthtrace-client';
import { Readable } from 'stream';
import { Scenario } from '../cli/scenario';
import { withClient } from '../lib/utils/with_client';

import { getSynthtraceEnvironment } from '../lib/utils/get_synthtrace_environment';

import { IndexTemplateName } from '../lib/logs/custom_logsdb_index_templates';

const ENVIRONMENT = getSynthtraceEnvironment(__filename);

const MESSAGE_LOG_LEVELS = [
  { message: 'A simple log with something random <random> in the middle', level: 'info' },
  { message: 'Yet another debug log', level: 'debug' },
  { message: 'Error with certificate: "ca_trusted_fingerprint"', level: 'error' },
];

const scenario: Scenario = async (runOptions) => {
  const { logger } = runOptions;
  return {
    bootstrap: async ({ logsEsClient }) => {
      await logsEsClient.createIndexTemplate(IndexTemplateName.LogsDb);
    },
    generate: ({ range, clients: { logsEsClient } }) => {
      const SYNTHTRACE_LOGS = 'synthtrace-logs';
      const apmAndLogsLogsEvents = range
        .interval('1m')
        .rate(1)
        .generator((timestamp) => {
          return Array(3)
            .fill(0)
            .map(() => {
              const index = Math.floor(Math.random() * 3);
              const { message, level } = MESSAGE_LOG_LEVELS[index];
              return log
                .createMinimal({ dataset: 'generic.otel' })
                .message(message.replace('<random>', generateShortId()))
                .logLevel(level)
                .service(SYNTHTRACE_LOGS)
                .defaults({
                  'agent.name': 'nodejs',
                })
                .timestamp(timestamp);
            });
        });
      return [
        withClient(
          logsEsClient,
          logger.perf('generating_otel_logs', () => Readable.from(Array.from(apmAndLogsLogsEvents)))
        ),
      ];
    },
  };
};

export default scenario;
