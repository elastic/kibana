/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Simulates a faulty canary deployment where a new version of a service
 * introduces performance regressions.
 *
 * The Demo Story:
 * A new version of the `shipping-service` (v1.1.0) is being rolled out as a
 * canary. It receives 10% of traffic, while the stable version (v1.0.0)
 * receives the other 90%. The canary version has a higher error rate and
 * latency, and this scenario is designed to be solved by comparing the
 * performance of the two versions side-by-side.
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

      // Generate Traces
      const apmEvents = timestamps.generator((timestamp, i) => {
        const isCanary = i % 10 === 0; // 10% of traffic goes to the canary
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
        const isCanaryFailure = i % 10 === 0 && i % 5 === 0;
        if (isCanaryFailure) {
          return log
            .create({ isLogsDb })
            .message('ERROR: New shipping rate calculator failed for carrier XYZ')
            .logLevel('error')
            .defaults({
              'service.name': SERVICE_NAME,
              'labels': { 'service_version': CANARY_VERSION },
              'service.environment': ENVIRONMENT,
            })
            .timestamp(timestamp);
        }
        return [];
      });

      return [
        withClient(apmEsClient, logger.perf('generating_apm_events', () => apmEvents)),
        withClient(logsEsClient, logger.perf('generating_log_events', () => logEvents)),
      ];
    },
  };
};

export default scenario;
