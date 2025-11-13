/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Generates unstructured log messages from different sources like Java and web servers.
 */

import type { LogDocument } from '@kbn/apm-synthtrace-client';
import { log } from '@kbn/apm-synthtrace-client';
import moment from 'moment';
import type { Scenario } from '../cli/scenario';
import { IndexTemplateName } from '../lib/logs/custom_logsdb_index_templates';
import { withClient } from '../lib/utils/with_client';
import { parseLogsScenarioOpts } from './helpers/logs_scenario_opts_parser';
import { getWebLogs } from './helpers/logs_mock_data';

const scenario: Scenario<LogDocument> = async (runOptions) => {
  const { isLogsDb } = parseLogsScenarioOpts(runOptions.scenarioOpts);
  return {
    bootstrap: async ({ logsEsClient }) => {
      if (isLogsDb) await logsEsClient.createIndexTemplate(IndexTemplateName.LogsDb);
    },
    teardown: async ({ logsEsClient }) => {
      if (isLogsDb) await logsEsClient.deleteIndexTemplate(IndexTemplateName.LogsDb);
    },
    generate: ({ range, clients: { logsEsClient } }) => {
      const { logger } = runOptions;

      const getMalformedMessageLogs = (timestamp: number) => {
        const timestampStr = moment(timestamp).toISOString();
        const ip = `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
        const methods = ['GET', 'POST', 'PUT'];
        const method = methods[Math.floor(Math.random() * methods.length)];
        const path = `/api/${Math.random().toString(36).substring(7)}`;
        
        return [
          // HTTP status codes that are non-numeric
          `${ip} - - [${timestampStr}] "${method} ${path} HTTP/1.1" ERROR 1234 "-" "Mozilla/5.0"`,
          `${ip} - - [${timestampStr}] "${method} ${path} HTTP/1.1" N/A 1234 "-" "Mozilla/5.0"`,
          `${ip} - - [${timestampStr}] "${method} ${path} HTTP/1.1" TIMEOUT 1234 "-" "Mozilla/5.0"`,
          
          // Response bytes that are non-numeric
          `${ip} - - [${timestampStr}] "${method} ${path} HTTP/1.1" 200 N/A "-" "Mozilla/5.0"`,
          `${ip} - - [${timestampStr}] "${method} ${path} HTTP/1.1" 200 ERROR "-" "Mozilla/5.0"`,
          `${ip} - - [${timestampStr}] "${method} ${path} HTTP/1.1" 200 unknown "-" "Mozilla/5.0"`,
        ];
      };

      const logs = range
        .interval('1m')
        .rate(1)
        .generator((timestamp) => {
          return [
            ...getWebLogs().map((message) => {
              const serverPort = [443, 8080, 8443, 3000, 5000, 'default', 'N/A'][Math.floor(Math.random() * 7)]; // Common web server ports and some malformed
              return log
                .create({ isLogsDb })
                .dataset('web')
                .message(message)
                .defaults({
                  'log.custom': {
                    'server.port': serverPort,
                  },
                })
                .timestamp(timestamp);
            }),
            // Add malformed web logs (about 10% of total web logs, minimum 1-2 per batch)
            ...getMalformedMessageLogs(timestamp)
              .slice(0, Math.max(1, Math.floor(getWebLogs().length * 0.1)))
              .map((message) => {
                const serverPort = [443, 8080, 8443, 3000, 5000][Math.floor(Math.random() * 5)]; // Common web server ports
                return log.create({ isLogsDb }).dataset('web').message(message).defaults({
                  'log.custom': {
                    'server.port': serverPort,
                  },
                }).timestamp(timestamp)
              }),
          ];
        });

      return withClient(
        logsEsClient,
        logger.perf('generating_logs', () => logs)
      );
    },
  };
};

export default scenario;
