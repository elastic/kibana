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
 * TROUBLESHOOTING PATH (MANUAL):
 * 1. Start in APM for the `api-gateway` and observe the 100% failure rate.
 * 2. Notice that the `user-profile-service` shows no signs of failure.
 * 3. Examine a failed trace from the `api-gateway`. Note the absence of any exit
 *    spans to the `user-profile-service`.
 * 4. Inspect the error documents attached to the failed trace, which will show the
 *    `EAI_AGAIN` DNS error.
 * 5. Correlate with logs from the `api-gateway`, which show the same error message.
 *
 * AI ASSISTANT QUESTIONS:
 * - "Why is the api-gateway failing?"
 * - "Is the user-profile-service healthy?"
 * - "Show me the errors for the api-gateway."
 */

import type { ApmFields, LogDocument } from '@kbn/apm-synthtrace-client';
import { apm, log, httpExitSpan } from '@kbn/apm-synthtrace-client';
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
