/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { apm, ApmSynthtracePipelineSchema, log } from '@kbn/apm-synthtrace-client';
import type { Scenario } from '../cli/scenario';
import { getSynthtraceEnvironment } from '../lib/utils/get_synthtrace_environment';
import { withClient } from '../lib/utils/with_client';
import { parseApmScenarioOpts } from './helpers/apm_scenario_ops_parser';
import { parseLogsScenarioOpts } from './helpers/logs_scenario_opts_parser';

const ENVIRONMENT = getSynthtraceEnvironment(__filename);

const scenario: Scenario = async (runOptions) => {
  const { logger } = runOptions;
  const { pipeline = ApmSynthtracePipelineSchema.Default } = parseApmScenarioOpts(
    runOptions.scenarioOpts
  );
  const { isLogsDb } = parseLogsScenarioOpts(runOptions.scenarioOpts);

  return {
    generate: ({ range, clients: { apmEsClient, logsEsClient } }) => {
      const transactionName = 'GET /products';

      // Services involved in the scenario
      const productService = apm
        .service({ name: 'product-service', environment: ENVIRONMENT, agentName: 'nodejs' })
        .instance('instance-ps-1');

      // Timestamps for standard users (always successful)
      const standardUserTimestamps = range.interval('1s').rate(8); // 80% of traffic
      const standardUserTraces = standardUserTimestamps.generator((timestamp) =>
        productService
          .transaction({ transactionName })
          .timestamp(timestamp)
          .duration(200)
          .success()
          .labels({ 'user.tier': 'standard' })
      );

      // Timestamps for premium users (always failing)
      const premiumUserTimestamps = range.interval('1s').rate(2); // 20% of traffic
      const premiumUserTraces = premiumUserTimestamps.generator((timestamp, i) =>
        productService
          .transaction({ transactionName })
          .timestamp(timestamp)
          .duration(80) // Fails fast
          .failure()
          .labels({ 'user.tier': 'premium' })
          .children(
            productService
              .span({
                spanName: 'GET recommendation-service/recommendations',
                spanType: 'external',
                spanSubtype: 'http',
              })
              .duration(75)
              .failure()
              .destination('recommendation-service')
              .timestamp(timestamp)
              .defaults({
                'http.response.status_code': 401,
                'http.request.method': 'GET',
                'url.original': 'http://recommendation-service/recommendations',
              })
          )
          .errors(
            productService
              .error({
                message: `recommendation-service returned 401 Unauthorized`,
                type: 'HttpAuthenticationError',
              })
              .timestamp(timestamp + 5)
          )
      );

      // Logs from product-service for failed requests
      const productServiceLogs = premiumUserTimestamps.generator((timestamp, i) => {
        return log
          .create({ isLogsDb })
          .message(
            `Failed to fetch recommendations for user premium_${i}. recommendation-service returned 401 Unauthorized`
          )
          .logLevel('error')
          .defaults({
            'service.name': 'product-service',
            'service.environment': ENVIRONMENT,
          })
          .timestamp(timestamp);
      });

      // Logs from recommendation-service for auth failures
      const recommendationServiceLogs = premiumUserTimestamps.generator((timestamp) => {
        return log
          .create({ isLogsDb })
          .message(`Authentication failed for client 'product-service'. Invalid token provided.`)
          .logLevel('warn')
          .defaults({
            'service.name': 'recommendation-service',
            'service.environment': ENVIRONMENT,
          })
          .timestamp(timestamp);
      });

      return [
        withClient(
          apmEsClient,
          logger.perf('generating_apm_events', () => [standardUserTraces, premiumUserTraces])
        ),
        withClient(
          logsEsClient,
          logger.perf('generating_log_events', () => [
            productServiceLogs,
            recommendationServiceLogs,
          ])
        ),
      ];
    },
    setupPipeline: ({ apmEsClient }) =>
      apmEsClient.setPipeline(apmEsClient.resolvePipelineType(pipeline)),
  };
};

export default scenario;
