/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * SCENARIO: DNS Resolution Failure
 * Simulates an incident where an upstream service cannot connect to its downstream
 * dependency due to a DNS resolution failure.
 *
 * THE STORY:
 * The `api-gateway` is failing, but the downstream `user-profile-service` it calls
 * appears perfectly healthy. The root cause is not a service failure, but a
 * network-level issue preventing the gateway from resolving the user service's hostname.
 *
 * ROOT CAUSE:
 * The `api-gateway` produces `getaddrinfo EAI_AGAIN user-profile-service` errors,
 * indicating a DNS lookup failure. There are no exit spans from the gateway to the
 * user service during the incident, as the requests fail before being sent.
 *
 * TROUBLESHOOTING PATH (OBSERVABILITY UI):
 * 1. Start in the APM UI for the 'api-gateway' and observe the 100% failure rate.
 * 2. Navigate to the Service Map, which will show the 'api-gateway' as red and the
 *    downstream 'user-profile-service' as green, with no connecting line during
 *    the incident.
 * 3. Go to the "Errors" tab for the 'api-gateway'. The top error will be
 *    'getaddrinfo EAI_AGAIN user-profile-service'.
 * 4. Click on the error to view its details. This confirms the DNS lookup failure.
 *    Examining a failed trace sample will show the absence of any exit spans to the
 *    'user-profile-service', as the request failed before being sent.
 *
 * TROUBLESHOOTING PATH (PLATFORM TOOLS):
 * 1. Start in Discover with the 'traces-apm-*' data view. Filter for
 *    'service.name: "api-gateway"' and 'transaction.result: "failure"'. Note the
 *    100% failure rate during the incident period.
 * 2. Investigate the health of the downstream service by changing the filter to
 *    'service.name: "user-profile-service"'. Observe that it has no failures.
 * 3. Go back to the failed 'api-gateway' transactions. Inspect the 'error.message'
 *    field in the documents, which clearly states "getaddrinfo EAI_AGAIN user-profile-service".
 * 4. To confirm, examine a full trace by filtering for a specific 'trace.id'. You
 *    will see a transaction for the 'api-gateway' but notice the complete absence
 *    of any spans connecting to the 'user-profile-service', confirming the request
 *    never left the gateway.
 *
 * AI ASSISTANT QUESTIONS:
 * - "Why is the api-gateway failing?"
 * - "Is the user-profile-service healthy?"
 * - "Show me the errors for the api-gateway."
 */

import type { ApmFields, LogDocument } from '@kbn/synthtrace-client';
import { apm, log, httpExitSpan } from '@kbn/synthtrace-client';
import type { Scenario } from '../../cli/scenario';
import { getSynthtraceEnvironment } from '../../lib/utils/get_synthtrace_environment';
import { withClient } from '../../lib/utils/with_client';
import { parseLogsScenarioOpts } from '../helpers/logs_scenario_opts_parser';

const ENVIRONMENT = getSynthtraceEnvironment(__filename);
const UPSTREAM_SERVICE = 'api-gateway';
const DOWNSTREAM_SERVICE = 'user-profile-service';

const scenario: Scenario<ApmFields | LogDocument> = async (runOptions) => {
  const { logger } = runOptions;
  const { isLogsDb } = parseLogsScenarioOpts(runOptions.scenarioOpts);

  return {
    generate: ({ range, clients: { apmEsClient, logsEsClient } }) => {
      const timestamps = range.interval('1s').rate(10);
      const incidentStartTime =
        range.from.getTime() + (range.to.getTime() - range.from.getTime()) * 0.5;

      const apiGateway = apm
        .service({ name: UPSTREAM_SERVICE, agentName: 'nodejs', environment: ENVIRONMENT })
        .instance('ag-1');

      const userProfileService = apm
        .service({ name: DOWNSTREAM_SERVICE, agentName: 'go', environment: ENVIRONMENT })
        .instance('ups-1');

      // Generate traces
      const apmEvents = timestamps.generator((timestamp) => {
        const isIncident = timestamp > incidentStartTime;

        // Downstream service is always healthy
        const userProfileTransaction = userProfileService
          .transaction({ transactionName: 'GET /api/users/{id}' })
          .timestamp(timestamp)
          .duration(100)
          .success();

        const apiGatewayTransaction = apiGateway
          .transaction({ transactionName: 'GET /users/{id}' })
          .timestamp(timestamp);

        if (isIncident) {
          // During the incident, the gateway fails to resolve DNS
          apiGatewayTransaction
            .duration(50) // Fails fast
            .failure()
            .errors(
              apiGateway
                .error({
                  message: `getaddrinfo EAI_AGAIN ${DOWNSTREAM_SERVICE}`,
                  type: 'system',
                })
                .timestamp(timestamp)
            );
          return [apiGatewayTransaction, userProfileTransaction];
        }

        // Before the incident, everything works
        const exitSpan = apiGateway
          .span(
            httpExitSpan({
              spanName: `GET /api/users/{id}`,
              destinationUrl: `http://${DOWNSTREAM_SERVICE}`,
            })
          )
          .timestamp(timestamp)
          .duration(110)
          .children(userProfileTransaction);

        apiGatewayTransaction.duration(150).success().children(exitSpan);

        return [apiGatewayTransaction];
      });

      // Generate logs
      const logEvents = timestamps.generator((timestamp) => {
        const isIncident = timestamp > incidentStartTime;

        if (isIncident) {
          return log
            .create({ isLogsDb })
            .message(`[error] getaddrinfo EAI_AGAIN ${DOWNSTREAM_SERVICE}`)
            .logLevel('error')
            .defaults({
              'service.name': UPSTREAM_SERVICE,
              'service.environment': ENVIRONMENT,
            })
            .timestamp(timestamp);
        }

        return log
          .create({ isLogsDb })
          .message('Request to user-profile-service succeeded')
          .logLevel('info')
          .defaults({
            'service.name': UPSTREAM_SERVICE,
            'service.environment': ENVIRONMENT,
          })
          .timestamp(timestamp);
      });

      return [
        withClient(
          apmEsClient,
          logger.perf('generating_apm_events', () => apmEvents)
        ),
        withClient(
          logsEsClient,
          logger.perf('generating_log_events', () => logEvents)
        ),
      ];
    },
  };
};

export default scenario;
