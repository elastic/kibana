/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Simulates a slow-burn memory leak in a service, leading to performance
 * degradation and eventual crashes.
 *
 * The Demo Story:
 * A critical `cart-service` shows slowly degrading performance, with transaction
 * times creeping up. The service intermittently crashes and restarts, after which
 * performance returns to normal, but the cycle of degradation repeats. This
 * scenario is designed to be solved by correlating the sawtooth memory pattern
 * with increasing latency and the final `OutOfMemoryError` log.
 */

import type { ApmFields, LogDocument } from '@kbn/apm-synthtrace-client';
import { apm, log } from '@kbn/apm-synthtrace-client';
import type { Scenario } from '../../cli/scenario';
import { getSynthtraceEnvironment } from '../../lib/utils/get_synthtrace_environment';
import { withClient } from '../../lib/utils/with_client';
import { parseLogsScenarioOpts } from '../helpers/logs_scenario_opts_parser';

const ENVIRONMENT = getSynthtraceEnvironment(__filename);
const SERVICE_NAME = 'cart-service';
const CYCLE_DURATION_MS = 45 * 60 * 1000; // 45 minutes

const scenario: Scenario<ApmFields | LogDocument> = async (runOptions) => {
  const { logger } = runOptions;
  const { isLogsDb } = parseLogsScenarioOpts(runOptions.scenarioOpts);

  return {
    generate: ({ range, clients: { apmEsClient, logsEsClient } }) => {
      const timestamps = range.interval('5s').rate(10);

      const cartService = apm
        .service({ name: SERVICE_NAME, agentName: 'java', environment: ENVIRONMENT })
        .instance('cart-instance-1');

      // Generate Traces and Metrics
      const apmEvents = timestamps.generator((timestamp, i) => {
        const timeIntoCycle = (timestamp - range.from.getTime()) % CYCLE_DURATION_MS;
        const percentageThroughCycle = timeIntoCycle / CYCLE_DURATION_MS;

        // Latency increases as memory pressure grows
        const baseLatency = 150;
        const addedLatency = percentageThroughCycle * 2000; // Max 2s added latency
        const duration = baseLatency + addedLatency;

        // Memory usage follows a sawtooth pattern
        const heapUsed = 100 + percentageThroughCycle * 800; // Climbs from 100MB to 900MB

        const transaction = cartService
          .transaction({ transactionName: 'POST /cart/add' })
          .timestamp(timestamp)
          .duration(duration)
          .success();

        const metrics = cartService
          .appMetrics({
            'jvm.memory.heap.used': heapUsed * 1024 * 1024, // in bytes
          })
          .timestamp(timestamp);

        // At the end of the cycle, simulate a crash
        if (i % 540 < 50) {
          // 540 = 45 minutes / 5 seconds per event
          transaction.failure().errors(
            cartService
              .error({
                message: 'java.lang.OutOfMemoryError: Java heap space',
                type: 'java.lang.OutOfMemoryError',
              })
              .timestamp(timestamp)
          );
        }

        return [transaction, metrics];
      });

      // Generate Logs
      const crashLogEvents = timestamps.generator((timestamp, i) => {
        if (i % 540 < 50) {
          return log
            .create({ isLogsDb })
            .message('java.lang.OutOfMemoryError: Java heap space')
            .logLevel('error')
            .defaults({
              'service.name': SERVICE_NAME,
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
          logger.perf('generating_log_events', () => crashLogEvents)
        ),
      ];
    },
  };
};

export default scenario;
