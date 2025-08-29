/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Simulates a subtle "bad feature flag" incident affecting a specific subset of users.
 *
 * The Demo Story:
 * "The product team has just enabled a new 'Personalized Recommendations' feature for
 * our premium-tier users. A few minutes later, a VIP customer contacts support,
 * saying product searches are failing. No main alarms have fired because the overall
 * error rate for the `product-service` is still very low. An engineer needs to
 * investigate this 'needle in a haystack' problem."
 *
 * What this scenario generates:
 * Product searches start failing, but only for users with `user.tier: 'premium'`.
 * This is caused by a bad configuration in the new feature that results in a
 * 401 Unauthorized error from a downstream `recommendation-service`.
 */

import { apm, ApmSynthtracePipelineSchema, log } from '@kbn/apm-synthtrace-client';
import type { Scenario } from '../../cli/scenario';
import { getSynthtraceEnvironment } from '../../lib/utils/get_synthtrace_environment';
import { withClient } from '../../lib/utils/with_client';
import { parseApmScenarioOpts } from '../helpers/apm_scenario_ops_parser';
import { parseLogsScenarioOpts } from '../helpers/logs_scenario_opts_parser';

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

      // Timestamps for standard users (mostly successful with some noise)
      const standardUserTimestamps = range.interval('1s').rate(8); // 80% of traffic
      const standardUserTraces = standardUserTimestamps.generator((timestamp, i) => {
        const transaction = productService.transaction({ transactionName }).timestamp(timestamp);

        // Introduce a low, baseline failure rate for standard users
        if (i % 50 === 0) { // Roughly 2% failure rate
          return transaction
            .duration(350)
            .failure()
            .labels({ 'user.tier': 'standard' })
            .errors(
              productService
                .error({
                  message: `Failed to connect to database`,
                  type: 'DBConnectionError',
                })
                .timestamp(timestamp + 5)
            );
        }

        return transaction.duration(200).success().labels({ 'user.tier': 'standard' });
      });

      // Timestamps for premium users (high failure rate)
      const premiumUserTimestamps = range.interval('1s').rate(2); // 20% of traffic
      const premiumUserTraces = premiumUserTimestamps.generator((timestamp, i) => {
        const transaction = productService.transaction({ transactionName }).timestamp(timestamp);

        // ~80% of premium users experience the failure
        if (i % 5 < 4) { // 4 out of 5 = 80%
          return transaction
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
                  // Obfuscate the error: the direct service sees a generic 500
                  'http.response.status_code': 500,
                  'http.request.method': 'GET',
                  'url.original': 'http://recommendation-service/recommendations',
                })
            )
            .errors(
              productService
                .error({
                  message: `recommendation-service returned 500 Internal Server Error`,
                  type: 'HttpServerError',
                })
                .timestamp(timestamp + 5)
            );
        }

        // The other ~20% of premium users are successful
        return transaction.duration(220).success().labels({ 'user.tier': 'premium' });
      });

      // Logs from product-service for failed requests (now only for premium users)
      const productServiceLogs = premiumUserTimestamps.generator((timestamp, i) => {
        // Only log for the failing requests
        if (i % 5 < 4) {
          return log
            .create({ isLogsDb })
            .message(
              `Failed to fetch recommendations for user premium_${i}. recommendation-service returned 500 Internal Server Error`
            )
            .logLevel('error')
            .defaults({
              'service.name': 'product-service',
              'service.environment': ENVIRONMENT,
            })
            .timestamp(timestamp);
        }
        return [];
      });

      // Logs from recommendation-service (THE NEEDLE: this is where the real 401 is)
      const recommendationServiceLogs = premiumUserTimestamps.generator((timestamp, i) => {
        if (i % 5 < 4) {
          return log
            .create({ isLogsDb })
            .message(`Authentication failed for client 'product-service'. Invalid token provided.`)
            .logLevel('warn')
            .defaults({
              'service.name': 'recommendation-service',
              'service.environment': ENVIRONMENT,
            })
            .timestamp(timestamp);
        }
        return [];
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
