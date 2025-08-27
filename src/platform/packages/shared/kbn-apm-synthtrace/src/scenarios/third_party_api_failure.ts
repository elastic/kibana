/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ApmFields, LogDocument } from '@kbn/apm-synthtrace-client';
import {
  apm,
  ApmSynthtracePipelineSchema,
  generateLongId,
  httpExitSpan,
  log,
} from '@kbn/apm-synthtrace-client';
import type { Scenario } from '../cli/scenario';
import { getSynthtraceEnvironment } from '../lib/utils/get_synthtrace_environment';
import { withClient } from '../lib/utils/with_client';
import { parseApmScenarioOpts } from './helpers/apm_scenario_ops_parser';
import { parseLogsScenarioOpts } from './helpers/logs_scenario_opts_parser';

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

      // Define all services
      const frontendService = apm
        .service({ name: 'frontend-service', agentName: 'rum-js', environment: ENVIRONMENT })
        .instance('fe-1');
      const apiGateway = apm
        .service({ name: 'api-gateway', agentName: 'go', environment: ENVIRONMENT })
        .instance('gw-1');
      const checkoutService = apm
        .service({ name: 'checkout-service', agentName: 'nodejs', environment: ENVIRONMENT })
        .instance('co-1');
      const authService = apm
        .service({ name: 'auth-service', agentName: 'java', environment: ENVIRONMENT })
        .instance('au-1');
      const userProfileService = apm
        .service({ name: 'user-profile-service', agentName: 'python', environment: ENVIRONMENT })
        .instance('up-1');
      const inventoryService = apm
        .service({ name: 'inventory-service', agentName: 'nodejs', environment: ENVIRONMENT })
        .instance('in-1');

      const traceEvents = timestamps.generator((timestamp) => {
        const traceId = generateLongId();

        const authExit = checkoutService
          .span(
            httpExitSpan({ spanName: 'POST /check_auth', destinationUrl: 'http://auth-service' })
          )
          .timestamp(timestamp + 50)
          .duration(30)
          .children(
            authService
              .transaction({ transactionName: 'POST /check_auth' })
              .timestamp(timestamp + 50)
              .duration(30)
              .success()
          );
        const userProfileExit = checkoutService
          .span(
            httpExitSpan({
              spanName: 'GET /user_profile',
              destinationUrl: 'http://user-profile-service',
            })
          )
          .timestamp(timestamp + 80)
          .duration(40)
          .children(
            userProfileService
              .transaction({ transactionName: 'GET /user_profile' })
              .timestamp(timestamp + 80)
              .duration(40)
              .success()
          );
        const inventoryExit = checkoutService
          .span(
            httpExitSpan({
              spanName: 'POST /reserve_stock',
              destinationUrl: 'http://inventory-service',
            })
          )
          .timestamp(timestamp + 120)
          .duration(60)
          .children(
            inventoryService
              .transaction({ transactionName: 'POST /reserve_stock' })
              .timestamp(timestamp + 120)
              .duration(60)
              .success()
          );

        const failingShippingSpan = checkoutService
          .span({
            spanName: 'GET shipping-rates-api.com',
            spanType: 'external',
            spanSubtype: 'http',
          })
          .duration(240)
          .failure()
          .destination('shipping-rates-api.com')
          .timestamp(timestamp + 180)
          .defaults({ 'http.response.status_code': 503 });

        const checkoutTransaction = checkoutService
          .transaction({ transactionName: 'POST /checkout' })
          .timestamp(timestamp + 45)
          .duration(450)
          .failure()
          .children(authExit, userProfileExit, inventoryExit, failingShippingSpan)
          .errors(
            checkoutService
              .error({
                message: 'Failed to retrieve shipping rates. External API returned status 503',
              })
              .timestamp(timestamp + 420)
          );

        const apiGatewayExit = apiGateway
          .span(
            httpExitSpan({
              spanName: 'POST /api/v1/checkout',
              destinationUrl: 'http://checkout-service',
            })
          )
          .timestamp(timestamp + 20)
          .duration(500)
          .children(checkoutTransaction);
        const apiGatewayTransaction = apiGateway
          .transaction({ transactionName: 'POST /api/v1/checkout' })
          .timestamp(timestamp + 20)
          .duration(500)
          .failure()
          .children(apiGatewayExit)
          .errors(
            apiGateway
              .error({ message: 'Downstream service checkout-service failed' })
              .timestamp(timestamp + 480)
          );

        const frontendTransaction = frontendService
          .transaction({ transactionName: 'Submit Checkout Form' })
          .timestamp(timestamp)
          .duration(550)
          .failure()
          .children(apiGatewayTransaction)
          .errors(frontendService.error({ message: 'API call failed' }).timestamp(timestamp + 520));

        const allEvents = [frontendTransaction];
        allEvents.forEach((event) =>
          event.defaults({ 'trace.id': traceId, 'service.environment': ENVIRONMENT })
        );

        return allEvents;
      });

      const logEvents = timestamps.generator((timestamp) => {
        const traceId = generateLongId();
        return [
          log
            .create({ isLogsDb })
            .message(
              'Failed to retrieve shipping rates for transaction. External API returned status 503'
            )
            .logLevel('error')
            .defaults({
              'service.name': 'checkout-service',
              'trace.id': traceId,
              'service.environment': ENVIRONMENT,
            })
            .timestamp(timestamp + 425),
          log
            .create({ isLogsDb })
            .message('Downstream service checkout-service failed with status 500')
            .logLevel('error')
            .defaults({
              'service.name': 'api-gateway',
              'trace.id': traceId,
              'service.environment': ENVIRONMENT,
            })
            .timestamp(timestamp + 485),
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
