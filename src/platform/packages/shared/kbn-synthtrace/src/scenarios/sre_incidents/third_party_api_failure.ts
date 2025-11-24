/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * SCENARIO: Third-Party API Failure
 * Simulates a cascading failure caused by a critical third-party API outage.
 *
 * THE STORY:
 * "We're an e-commerce company. Our on-call SRE gets a high-severity alert:
 * 'Checkout Success Rate has dropped to 0%'. Users are calling support, saying
 * they can't buy anything. Revenue has stopped. The SRE needs to find the root
 * cause immediately."
 *
 * ROOT CAUSE:
 * The external `shipping-rates-api.com` dependency begins returning
 * `HTTP 503 Service Unavailable` errors, causing all checkout transactions to fail.
 *
 * TROUBLESHOOTING PATH (OBSERVABILITY UI):
 * 1. Start in the APM Service Map. Observe that the 'checkout-service' is red and
 *    the external dependency 'shipping-rates-api.com' is also red.
 * 2. Click on the 'checkout-service' and go to the "Dependencies" tab. Note that
 *    'shipping-rates-api.com' has a high error rate and impact score.
 * 3. Inspect a failed trace from the 'checkout-service'. The trace waterfall will
 *    show a red external HTTP span to 'shipping-rates-api.com'.
 * 4. Click the failed span to see the 'http.response.status_code: 503' in the metadata.
 *
 * TROUBLESHOOTING PATH (PLATFORM TOOLS):
 * 1. Start in Discover with the 'traces-apm-*' data view. Filter for
 *    'service.name: "checkout-service"' and 'transaction.result: "failure"'.
 * 2. Inspect a failed document and find the 'trace.id'. Use this ID to view the
 *    full trace.
 * 3. Sort the trace documents by '@timestamp'. You will see a span with
 *    'span.type: "external"' and 'url.domain: "shipping-rates-api.com"' that has
 *    'transaction.result: "failure"'.
 * 4. Examine this external span document. The field 'http.response.status_code'
 *    will be '503', identifying the failing external dependency as the root cause.
 * 5. Alternatively, in Lens, create a Data Table. Use "Top values of 'url.domain'"
 *    as the primary dimension and "Count of documents" as the metric. Filter for
 *    'span.type: "external"' and 'transaction.result: "failure"'. This will list
 *    all failing external dependencies, with 'shipping-rates-api.com' at the top.
 *
 * AI ASSISTANT QUESTIONS:
 * - "What is the root cause of the errors in the checkout-service?"
 * - "Are there any failing dependencies?"
 * - "Show me the HTTP status code for calls to shipping-rates-api.com."
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

      const incidentStartTime =
        range.from.getTime() + (range.to.getTime() - range.from.getTime()) * 0.5;

      const traceEvents = timestamps.generator((timestamp) => {
        const traceId = generateLongId();
        const isIncident = timestamp > incidentStartTime;

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
          .outcome(isIncident ? 'failure' : 'success')
          .destination('shipping-rates-api.com')
          .timestamp(timestamp + 180)
          .defaults({ 'http.response.status_code': isIncident ? 503 : 200 });

        const checkoutTransaction = checkoutService
          .transaction({ transactionName: 'POST /checkout' })
          .timestamp(timestamp + 45)
          .duration(isIncident ? 450 : 250)
          .outcome(isIncident ? 'failure' : 'success')
          .children(authExit, userProfileExit, inventoryExit, failingShippingSpan);

        if (isIncident) {
          checkoutTransaction.errors(
            checkoutService
              .error({
                message: 'Failed to retrieve shipping rates. External API returned status 503',
              })
              .timestamp(timestamp + 420)
          );
        }

        const apiGatewayExit = apiGateway
          .span(
            httpExitSpan({
              spanName: 'POST /api/v1/checkout',
              destinationUrl: 'http://checkout-service',
            })
          )
          .timestamp(timestamp + 20)
          .duration(isIncident ? 500 : 300)
          .children(checkoutTransaction);
        const apiGatewayTransaction = apiGateway
          .transaction({ transactionName: 'POST /api/v1/checkout' })
          .timestamp(timestamp + 20)
          .duration(isIncident ? 500 : 300)
          .outcome(isIncident ? 'failure' : 'success')
          .children(apiGatewayExit);

        if (isIncident) {
          apiGatewayTransaction.errors(
            apiGateway
              .error({ message: 'Downstream service checkout-service failed' })
              .timestamp(timestamp + 480)
          );
        }

        const frontendTransaction = frontendService
          .transaction({ transactionName: 'Submit Checkout Form' })
          .timestamp(timestamp)
          .duration(isIncident ? 550 : 350)
          .outcome(isIncident ? 'failure' : 'success')
          .children(apiGatewayTransaction);

        if (isIncident) {
          frontendTransaction.errors(
            frontendService.error({ message: 'API call failed' }).timestamp(timestamp + 520)
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
        const isIncident = timestamp > incidentStartTime;
        if (isIncident) {
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
        }
        return [];
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
