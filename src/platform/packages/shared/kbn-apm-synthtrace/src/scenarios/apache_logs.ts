/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { LogDocument, log } from '@kbn/apm-synthtrace-client';
import moment from 'moment';
import { random } from 'lodash';
import { Scenario } from '../cli/scenario';
import { withClient } from '../lib/utils/with_client';
import { parseLogsScenarioOpts } from './helpers/logs_scenario_opts_parser';
import { IndexTemplateName } from '../lib/logs/custom_logsdb_index_templates';

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

      // Normal access logs
      const normalAccessLogs = range
        .interval('1m')
        .rate(50)
        .generator((timestamp) => {
          return Array(5)
            .fill(0)
            .map(() => {
              const { commonLogFields } = constructApacheLogData();

              return log
                .create({ isLogsDb })
                .message(
                  `${commonLogFields['client.ip']} - - [${moment(timestamp).format(
                    'DD/MMM/YYYY:HH:mm:ss Z'
                  )}] "${commonLogFields['http.request.method']} ${
                    commonLogFields['url.path']
                  } HTTP/${commonLogFields['http.version']}" ${
                    commonLogFields['http.response.status_code']
                  } ${commonLogFields['http.response.bytes']}`
                )
                .dataset('apache.access')
                .defaults(commonLogFields)
                .timestamp(timestamp);
            });
        });

      // High traffic/attack simulation logs
      const attackSimulationLogs = range
        .interval('1m')
        .rate(2)
        .generator((timestamp) => {
          return Array(2)
            .fill(0)
            .map(() => {
              const { commonLogFields } = constructApacheLogData();

              return log
                .create({ isLogsDb })
                .message(
                  `ATTACK SIMULATION: ${commonLogFields['client.ip']} attempted access to restricted path ${commonLogFields['url.path']}`
                )
                .dataset('apache.security')
                .logLevel('warning')
                .defaults({
                  ...commonLogFields,
                  'event.category': 'network',
                  'event.type': 'access',
                  'event.outcome': 'failure',
                })
                .timestamp(timestamp);
            });
        });

      return withClient(
        logsEsClient,
        logger.perf('generating_apache_logs', () => [normalAccessLogs, attackSimulationLogs])
      );
    },
  };
};

export default scenario;

const APACHE_LOG_SCENARIOS = [
  {
    method: 'GET',
    path: '/index.html',
    responseCode: 200,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    referrer: 'https://www.google.com',
  },
  {
    method: 'POST',
    path: '/login',
    responseCode: 401,
    userAgent: 'PostmanRuntime/7.29.0',
    referrer: '-',
  },
  {
    method: 'GET',
    path: '/admin/dashboard',
    responseCode: 403,
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
    referrer: 'https://example.com/home',
  },
];

const HOSTNAMES = ['www.example.com', 'blog.example.com', 'api.example.com'];

const CLOUD_REGIONS = ['us-east-1', 'eu-west-2', 'ap-southeast-1'];

function constructApacheLogData() {
  const index = Math.floor(Math.random() * APACHE_LOG_SCENARIOS.length);
  const { method, path, responseCode, userAgent, referrer } = APACHE_LOG_SCENARIOS[index];

  const clientIp = generateIpAddress();
  const hostname = HOSTNAMES[Math.floor(Math.random() * HOSTNAMES.length)];
  const cloudRegion = CLOUD_REGIONS[Math.floor(Math.random() * CLOUD_REGIONS.length)];

  const commonLogFields: LogDocument = {
    'http.request.method': method,
    'url.path': path,
    'http.response.status_code': responseCode,
    hostname,
    'cloud.region': cloudRegion,
    'cloud.availability_zone': `${cloudRegion}a`,
    'client.ip': clientIp,
    'user_agent.name': userAgent,
    'http.request.referrer': referrer,
  };

  return {
    commonLogFields,
    method,
    path,
    responseCode,
  };
}

function generateIpAddress() {
  return `${random(0, 255)}.${random(0, 255)}.${random(0, 255)}.${random(0, 255)}`;
}
