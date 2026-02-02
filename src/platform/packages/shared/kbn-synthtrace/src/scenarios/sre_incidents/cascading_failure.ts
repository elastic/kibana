/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * SCENARIO: Cascading Failure
 * Simulates a cascading failure caused by a slow downstream dependency.
 *
 * THE STORY:
 * A slow database query in the `inventory-service` causes timeouts that cascade
 * up to the `product-recommendation` and user-facing `frontend-web` services.
 * The trace includes other healthy downstream dependencies (Redis, Elasticsearch)
 * to make identifying the root cause more challenging.
 *
 * ROOT CAUSE:
 * A slow DB query in the `inventory-service` causing a timeout error.
 *
 * TROUBLESHOOTING PATH (OBSERVABILITY UI):
 * 1. Start in the APM Service Map. Observe that the 'frontend-web' service is red,
 *    indicating a high error rate.
 * 2. Click on the 'frontend-web' service to go to its overview page. Note the high
 *    latency and error rate.
 * 3. Examine a failed trace sample. The trace waterfall shows a long-duration call
 *    to 'product-recommendation'.
 * 4. Click the 'product-recommendation' span and select "View service". Repeat the
 *    process, observing that its call to 'inventory-service' is the source of latency.
 * 5. In the 'inventory-service' trace, find the 'db.postgresql' span for
 *    'SELECT * FROM products' and note its extremely long duration and timeout error.
 *
 * TROUBLESHOOTING PATH (PLATFORM TOOLS):
 * 1. Start in Discover with the 'traces-apm-*' data view. Filter for
 *    'service.name: "frontend-web"' and 'transaction.result: "failure"'.
 * 2. Create a Lens visualization (e.g., Line Chart) plotting the average
 *    'transaction.duration.us' over time. Observe the dramatic spike in latency.
 * 3. Back in Discover, inspect a failed trace document. Find the 'trace.id' and
 *    use it to view all documents for that trace ('trace.id: "..."').
 * 4. Sort the trace documents by '@timestamp'. Follow the chain of events from
 *    'frontend-web' -> 'product-recommendation' -> 'inventory-service'.
 * 5. Notice the extremely long duration of the 'db.postgresql' span within the
 *    'inventory-service'. The associated error message, "PostgreSQL query timed out",
 *    pinpoints the root cause.
 *
 * AI ASSISTANT QUESTIONS:
 * - "What's causing the errors in the frontend-web service?"
 * - "Show me a trace for a failed transaction in the product-recommendation service."
 * - "Which downstream dependency of the inventory-service is the slowest?"
 * - "What is the root cause of the cascading failure?"
 */

import type { ApmFields, LogDocument } from '@kbn/synthtrace-client';
import {
  apm,
  ApmSynthtracePipelineSchema,
  generateLongId,
  httpExitSpan,
  log,
} from '@kbn/synthtrace-client';
import type { Scenario } from '../../cli/scenario';
import { getSynthtraceEnvironment } from '../../lib/utils/get_synthtrace_environment';
import { withClient } from '../../lib/utils/with_client';
import { parseApmScenarioOpts } from '../helpers/apm_scenario_ops_parser';
import { parseLogsScenarioOpts } from '../helpers/logs_scenario_opts_parser';

const ENVIRONMENT = getSynthtraceEnvironment(__filename);

const scenario: Scenario<LogDocument | ApmFields> = async (runOptions) => {
  const { logger } = runOptions;
  const { pipeline = ApmSynthtracePipelineSchema.Default } = parseApmScenarioOpts(
    runOptions.scenarioOpts
  );
  const { isLogsDb } = parseLogsScenarioOpts(runOptions.scenarioOpts);

  return {
    generate: ({ range, clients: { apmEsClient, logsEsClient } }) => {
      const timestamps = range.interval('1s').rate(10);
      const incidentStart =
        range.from.getTime() + (range.to.getTime() - range.from.getTime()) * 0.5;
      const incidentEnd = range.from.getTime() + (range.to.getTime() - range.from.getTime()) * 0.8;

      // Define all services
      const frontendWebService = apm
        .service({ name: 'frontend-web', agentName: 'rum-js', environment: ENVIRONMENT })
        .instance('fw-1');
      const productRecommendationService = apm
        .service({ name: 'product-recommendation', agentName: 'go', environment: ENVIRONMENT })
        .instance('pr-1');
      const inventoryService = apm
        .service({ name: 'inventory-service', agentName: 'nodejs', environment: ENVIRONMENT })
        .instance('is-1');
      const userPreferenceService = apm
        .service({ name: 'user-preference-service', agentName: 'python', environment: ENVIRONMENT })
        .instance('ups-1');

      const traceEvents = timestamps.generator((timestamp) => {
        const traceId = generateLongId();
        const isIncident = timestamp > incidentStart && timestamp < incidentEnd;

        const inventoryServiceDuration = isIncident ? 5000 : 100;

        const esSpan = inventoryService
          .span({
            spanName: 'GET /products/_search',
            spanType: 'db',
            spanSubtype: 'elasticsearch',
          })
          .outcome('success')
          .duration(20)
          .destination('elasticsearch')
          .timestamp(timestamp + 5);

        const inventoryDbSpan = inventoryService
          .span({
            spanName: 'SELECT * FROM products',
            spanType: 'db',
            spanSubtype: 'sql',
            ...(isIncident && {
              'error.message': 'PostgreSQL query timed out for statement: SELECT * FROM products',
              'error.type': 'db_timeout',
            }),
          })
          .outcome(isIncident ? 'failure' : 'success')
          .duration(inventoryServiceDuration * 0.8)
          .destination('postgres')
          .timestamp(timestamp + 30);

        const inventoryServiceTransaction = inventoryService
          .transaction({ transactionName: 'GET /products' })
          .timestamp(timestamp)
          .duration(inventoryServiceDuration)
          .outcome(isIncident ? 'failure' : 'success')
          .children(esSpan, inventoryDbSpan);

        if (isIncident) {
          inventoryServiceTransaction.errors(
            inventoryService
              .error({
                message: 'PostgreSQL query timed out for statement: SELECT * FROM products',
              })
              .timestamp(timestamp + inventoryServiceDuration)
          );
        }

        const userPreferenceRedisSpan = userPreferenceService
          .span({
            spanName: 'GET user:123',
            spanType: 'db',
            spanSubtype: 'redis',
          })
          .duration(15)
          .destination('redis')
          .timestamp(timestamp + 5);

        const userPreferenceTransaction = userPreferenceService
          .transaction({ transactionName: 'GET /preferences' })
          .timestamp(timestamp)
          .duration(25)
          .success()
          .children(userPreferenceRedisSpan);

        const recommendationToInventoryExit = productRecommendationService
          .span(
            httpExitSpan({
              spanName: 'GET /products',
              destinationUrl: 'http://inventory-service',
            })
          )
          .outcome(isIncident ? 'failure' : 'success')
          .timestamp(timestamp)
          .duration(inventoryServiceDuration + 50)
          .children(inventoryServiceTransaction);

        const recommendationToUserPreferenceExit = productRecommendationService
          .span(
            httpExitSpan({
              spanName: 'GET /preferences',
              destinationUrl: 'http://user-preference-service',
            })
          )
          .timestamp(timestamp)
          .duration(75)
          .children(userPreferenceTransaction);

        const productRecommendationServiceDuration = isIncident ? 5100 : 150;

        const productRecommendationTransaction = productRecommendationService
          .transaction({ transactionName: 'GET /recommendations' })
          .timestamp(timestamp)
          .duration(productRecommendationServiceDuration)
          .outcome(isIncident ? 'failure' : 'success')
          .children(recommendationToInventoryExit, recommendationToUserPreferenceExit);

        if (isIncident) {
          productRecommendationTransaction.errors(
            productRecommendationService
              .error({
                message: 'Downstream service inventory-service timed out',
              })
              .timestamp(timestamp + productRecommendationServiceDuration)
          );
        }

        const frontendWebServiceDuration = isIncident ? 5200 : 200;

        const frontendWebExit = frontendWebService
          .span(
            httpExitSpan({
              spanName: 'GET /recommendations',
              destinationUrl: 'http://product-recommendation-service',
            })
          )
          .outcome(isIncident ? 'failure' : 'success')
          .timestamp(timestamp)
          .duration(productRecommendationServiceDuration + 50)
          .children(productRecommendationTransaction);

        const frontendTransaction = frontendWebService
          .transaction({ transactionName: 'GET /products' })
          .timestamp(timestamp)
          .duration(frontendWebServiceDuration)
          .outcome(isIncident ? 'failure' : 'success')
          .children(frontendWebExit);

        if (isIncident) {
          frontendTransaction.errors(
            frontendWebService
              .error({
                message: 'Failed to load product recommendations',
              })
              .timestamp(timestamp + frontendWebServiceDuration)
          );
        }

        const allEvents = [frontendTransaction];
        allEvents.forEach((event) =>
          event.defaults({ 'trace.id': traceId, 'service.environment': ENVIRONMENT })
        );

        return allEvents;
      });

      const logEvents = timestamps.generator((timestamp) => {
        const traceId = generateLongId();
        const isIncident = timestamp > incidentStart && timestamp < incidentEnd;

        if (isIncident) {
          return [
            log
              .create({ isLogsDb })
              .message('Query timed out on inventory-service')
              .logLevel('error')
              .defaults({
                'service.name': 'inventory-service',
                'trace.id': traceId,
                'service.environment': ENVIRONMENT,
              })
              .timestamp(timestamp),
            log
              .create({ isLogsDb })
              .message('Downstream service inventory-service timed out')
              .logLevel('error')
              .defaults({
                'service.name': 'product-recommendation',
                'trace.id': traceId,
                'service.environment': ENVIRONMENT,
              })
              .timestamp(timestamp),
            log
              .create({ isLogsDb })
              .message('Failed to load product recommendations')
              .logLevel('error')
              .defaults({
                'service.name': 'frontend-web',
                'trace.id': traceId,
                'service.environment': ENVIRONMENT,
              })
              .timestamp(timestamp),
          ];
        }

        return [
          log
            .create({ isLogsDb })
            .message('Successfully retrieved products')
            .logLevel('info')
            .defaults({
              'service.name': 'frontend-web',
              'trace.id': traceId,
              'service.environment': ENVIRONMENT,
            })
            .timestamp(timestamp),
        ];
      });

      return [
        withClient(
          apmEsClient,
          logger.perf('generating_apm_events', () => traceEvents)
        ),
        withClient(
          logsEsClient,
          logger.perf('generating_log_events', () => logEvents)
        ),
      ];
    },
    setupPipeline: ({ apmEsClient }) =>
      apmEsClient.setPipeline(apmEsClient.resolvePipelineType(pipeline)),
  };
};

export default scenario;
