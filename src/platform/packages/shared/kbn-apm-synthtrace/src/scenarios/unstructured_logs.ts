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
import { log, generateShortId } from '@kbn/apm-synthtrace-client';
import moment from 'moment';
import type { Scenario } from '../cli/scenario';
import { IndexTemplateName } from '../lib/logs/custom_logsdb_index_templates';
import { withClient } from '../lib/utils/with_client';
import { parseLogsScenarioOpts } from './helpers/logs_scenario_opts_parser';
import { getJavaLogs, getWebLogs } from './helpers/logs_mock_data';

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

      // Malformed logs with type mismatches for demo purposes
      const getMalformedJavaLogs = (timestamp: number) => {
        const logLevels = ['INFO', 'WARN', 'ERROR'];
        const timestampStr = moment(timestamp).format('YYYY-MM-DD HH:mm:ss,SSS');
        const logLevel = logLevels[Math.floor(Math.random() * logLevels.length)];
        
        return [
          // HTTP status codes that are non-numeric
          `${timestampStr} ${logLevel} [main] com.example8.integration.ExternalServiceClient - HTTP ERROR: Failed to connect to "https://api.example.com/v1/resource"`,
          `${timestampStr} ${logLevel} [main] com.example8.integration.ExternalServiceClient - HTTP TIMEOUT: Request timed out after 30 seconds`,
          `${timestampStr} ${logLevel} [main] com.example8.integration.ExternalServiceClient - HTTP N/A: Service unavailable`,
          
          // User IDs that are non-numeric
          `${timestampStr} ${logLevel} [main] com.example4.security.AuthManager - User account locked after 3 failed login attempts for userId: ORD-${generateShortId()}`,
          `${timestampStr} ${logLevel} [main] com.example4.security.AuthManager - Password updated for userId: USER-${generateShortId()}`,
          `${timestampStr} ${logLevel} [main] com.example5.dao.UserDao - Insert operation succeeded for userId: TXN-${generateShortId()}`,
          
          // Result counts that are non-numeric
          `${timestampStr} ${logLevel} [main] com.example5.dao.UserDao - Retrieved N/A results for query: SELECT * FROM users WHERE status = "active"`,
          `${timestampStr} ${logLevel} [main] com.example5.dao.UserDao - Retrieved ERROR results for query: SELECT * FROM users WHERE status = "active"`,
          `${timestampStr} ${logLevel} [main] com.example5.dao.UserDao - Retrieved many results for query: SELECT * FROM users WHERE status = "active"`,
        ];
      };

      const getMalformedWebLogs = (timestamp: number) => {
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
            ...getJavaLogs().map((message) =>
              log.create({ isLogsDb }).dataset('java').message(message).timestamp(timestamp)
            ),
            ...getWebLogs().map((message) =>
              log.create({ isLogsDb }).dataset('web').message(message).timestamp(timestamp)
            ),
            // Add malformed logs (about 10% of total logs, minimum 1-2 per batch)
            ...getMalformedJavaLogs(timestamp)
              .slice(0, Math.max(1, Math.floor(getJavaLogs().length * 0.1)))
              .map((message) =>
                log.create({ isLogsDb }).dataset('java').message(message).timestamp(timestamp)
              ),
            ...getMalformedWebLogs(timestamp)
              .slice(0, Math.max(1, Math.floor(getWebLogs().length * 0.1)))
              .map((message) =>
                log.create({ isLogsDb }).dataset('web').message(message).timestamp(timestamp)
              ),
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
