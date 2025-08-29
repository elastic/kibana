/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * This scenario simulates a cascading failure incident.
 *
 * The story: A slow database query in the `inventory-service` causes a timeout.
 * This latency cascades up to the `product-recommendation` service and finally
 * to the user-facing `frontend-web` service, causing a full site outage for
 * a period of time. This provides a realistic example of how a downstream
 * dependency can impact the entire application stack.
 */

import type { ApmFields, LogDocument } from '@kbn/apm-synthtrace-client';
import {
  apm,
  ApmSynthtracePipelineSchema,
  generateLongId,
  httpExitSpan,
  log,
} from '@kbn/apm-synthtrace-client';
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

      const traceEvents = timestamps.generator((timestamp) => {
        const traceId = generateLongId();
        const isIncident = timestamp > incidentStart && timestamp < incidentEnd;

        const inventoryServiceDuration = isIncident ? 5000 : 100;
        const inventoryServiceOutcome = isIncident ? 'failure' : 'success';

        const inventoryDbSpan = inventoryService
          .span({
            spanName: 'SELECT * FROM products',
            spanType: 'db',
            spanSubtype: 'sql',
            ...(isIncident && {
              'event.outcome': 'failure',
              'error.message': 'PostgreSQL query timed out for statement: SELECT * FROM products',
              'error.type': 'db_timeout',
            }),
          })
          .duration(inventoryServiceDuration * 0.8)
          .destination('postgres')
          .timestamp(timestamp + 10);

        const inventoryServiceTransaction = inventoryService
          .transaction({ transactionName: 'GET /products' })
          .timestamp(timestamp)
          .duration(inventoryServiceDuration)
          .outcome(inventoryServiceOutcome)
          .children(inventoryDbSpan);

        if (isIncident) {
          inventoryServiceTransaction.errors(
            inventoryService
              .error({
                message: 'PostgreSQL query timed out for statement: SELECT * FROM products',
              })
              .timestamp(timestamp + inventoryServiceDuration)
          );
        }

        const productRecommendationExit = productRecommendationService
          .span(
            httpExitSpan({
              spanName: 'GET /products',
              destinationUrl: 'http://inventory-service',
            })
          )
          .timestamp(timestamp)
          .duration(inventoryServiceDuration + 50)
          .children(inventoryServiceTransaction);

        const productRecommendationServiceDuration = isIncident ? 5100 : 150;
        const productRecommendationServiceOutcome = isIncident ? 'failure' : 'success';

        const productRecommendationTransaction = productRecommendationService
          .transaction({ transactionName: 'GET /recommendations' })
          .timestamp(timestamp)
          .duration(productRecommendationServiceDuration)
          .outcome(productRecommendationServiceOutcome)
          .children(productRecommendationExit);

        if (isIncident) {
          productRecommendationTransaction.errors(
            productRecommendationService
              .error({
                message: 'Downstream service inventory-service timed out',
              })
              .timestamp(timestamp + productRecommendationServiceDuration)
          );
        }

        const frontendWebExit = frontendWebService
          .span(
            httpExitSpan({
              spanName: 'GET /recommendations',
              destinationUrl: 'http://product-recommendation-service',
            })
          )
          .timestamp(timestamp)
          .duration(productRecommendationServiceDuration + 50)
          .children(productRecommendationTransaction);

        const frontendWebServiceDuration = isIncident ? 5200 : 200;
        const frontendWebServiceOutcome = isIncident ? 'failure' : 'success';

        const frontendTransaction = frontendWebService
          .transaction({ transactionName: 'GET /products' })
          .timestamp(timestamp)
          .duration(frontendWebServiceDuration)
          .outcome(frontendWebServiceOutcome)
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
