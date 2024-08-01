/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { LogDocument, log } from '@kbn/apm-synthtrace-client';
import { Scenario } from '../cli/scenario';
import { withClient } from '../lib/utils/with_client';

const scenario: Scenario<LogDocument> = async (runOptions) => {
  return {
    generate: ({ range, clients: { logsEsClient } }) => {
      const { logger } = runOptions;

      // Logs Data logic
      const MESSAGE_LOG_LEVELS = [
        { message: 'A simple log with something random <random> in the middle', level: 'info' },
        { message: 'Yet another debug log', level: 'debug' },
        { message: 'Error with certificate: ca_trusted_fingerprint', level: 'error' },
      ];

      const SERVICE_NAMES = Array(3)
        .fill(null)
        .map((_, idx) => `synth-service-${idx}`);

      const getJSONMessage = (index: number) =>
        `{"@timestamp":"${new Date().toISOString()}","ecs.version":"8.10.0","log.level":"${
          MESSAGE_LOG_LEVELS[index].level
        }","message":"${
          MESSAGE_LOG_LEVELS[index].message
        }","service.environment":"production","service.name":"${
          SERVICE_NAMES[index]
        }","service.version":"1.0.0"}`;

      const logs = range
        .interval('1m')
        .rate(1)
        .generator((timestamp) => {
          return Array(3)
            .fill(0)
            .map(() => {
              const index = Math.floor(Math.random() * 3);
              return log
                .create()
                .dataset('synth.json')
                .message(getJSONMessage(index))
                .timestamp(timestamp);
            });
        });

      return withClient(
        logsEsClient,
        logger.perf('generating_logs', () => [logs])
      );
    },
  };
};

export default scenario;
