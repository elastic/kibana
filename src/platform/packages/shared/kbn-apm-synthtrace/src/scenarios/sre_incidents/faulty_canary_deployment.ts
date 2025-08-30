/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * SCENARIO: Faulty Canary Deployment
 * Simulates a faulty canary deployment where a new version of a service
 * introduces performance regressions.
 *
 * THE STORY:
 * A new version of the `shipping-service` (v1.1.0) is being rolled out as a
 * canary. Shortly after, the overall service health degrades slightly. The SRE
 * must quickly determine if the canary is healthy or if it needs to be rolled back.
 *
 * ROOT CAUSE:
 * The canary version (`service.version: '1.1.0'`) has a bug that causes
 * higher latency and a 20% error rate, while the stable version remains healthy.
 *
 * TROUBLESHOOTING PATH (MANUAL):
 * 1. Start in APM for the `shipping-service`. Observe a slight increase in latency
 *    and errors coinciding with a deployment annotation.
 * 2. Group the latency and error rate charts by `service.version`.
 * 3. Observe that `v1.1.0` is performing much worse than `v1.0.0`.
 * 4. Filter traces for `service.version: "1.1.0"` and `event.outcome: "failure"`
 *    to inspect a failed trace and find the root cause.
 *
 * AI ASSISTANT QUESTIONS:
 * - "Did the latest deployment of the shipping-service cause a regression?"
 * - "Compare the performance of shipping-service versions v1.0.0 and v1.1.0."
 * - "What errors are happening in version 1.1.0 of the shipping-service?"
 */

import type { ApmFields, LogDocument } from '@kbn/apm-synthtrace-client';
import { apm, log } from '@kbn/apm-synthtrace-client';
import type { Scenario } from '../../cli/scenario';
import { getSynthtraceEnvironment } from '../../lib/utils/get_synthtrace_environment';
import { withClient } from '../../lib/utils/with_client';
import { parseLogsScenarioOpts } from '../helpers/logs_scenario_opts_parser';

const ENVIRONMENT = getSynthtraceEnvironment(__filename);
const SERVICE_NAME = 'shipping-service';
const STABLE_VERSION = '1.0.0';
const CANARY_VERSION = '1.1.0';

const scenario: Scenario<ApmFields | LogDocument> = async (runOptions) => {
  const { logger } = runOptions;
  const { isLogsDb } = parseLogsScenarioOpts(runOptions.scenarioOpts);

  return {
    generate: ({ range, clients: { apmEsClient, logsEsClient } }) => {
      const timestamps = range.interval('1s').rate(10);

      const shippingService = apm
        .service({ name: SERVICE_NAME, agentName: 'go', environment: ENVIRONMENT })
        .instance('shipping-instance-1');

      const deploymentTime =
        range.from.getTime() + (range.to.getTime() - range.from.getTime()) * 0.5;

      // Generate Traces
      const apmEvents = timestamps.generator((timestamp, i) => {
        const isCanary = i % 10 === 0 && timestamp > deploymentTime; // 10% of traffic goes to the canary post-deployment
        const version = isCanary ? CANARY_VERSION : STABLE_VERSION;
        const duration = isCanary ? 800 : 400;
        const outcome = isCanary && i % 5 === 0 ? 'failure' : 'success'; // 20% error rate for canary

        const transaction = shippingService
          .transaction({ transactionName: 'POST /shipping/calculate' })
          .timestamp(timestamp)
          .duration(duration)
          .outcome(outcome)
          .defaults({ 'service.version': version });

        if (outcome === 'failure') {
          transaction.errors(
            shippingService
              .error({
                message: `New shipping rate calculator failed for carrier XYZ`,
                type: 'CalculatorError',
              })
              .timestamp(timestamp)
          );
        }

        return transaction;
      });

      // Generate Logs for the canary failures
      const logEvents = timestamps.generator((timestamp, i) => {
        const isCanaryFailure = i % 10 === 0 && i % 5 === 0 && timestamp > deploymentTime;
        if (isCanaryFailure) {
          return log
            .create({ isLogsDb })
            .message('ERROR: New shipping rate calculator failed for carrier XYZ')
            .logLevel('error')
            .defaults({
              'service.name': SERVICE_NAME,
              labels: { service_version: CANARY_VERSION },
              'service.environment': ENVIRONMENT,
            })
            .timestamp(timestamp);
        }
        return [];
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
