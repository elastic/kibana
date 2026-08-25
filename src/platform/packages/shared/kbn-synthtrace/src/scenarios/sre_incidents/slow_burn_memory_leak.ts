/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * SCENARIO: Slow-Burn Memory Leak
 * Simulates a service with a gradual memory leak, leading to performance
 * degradation and eventual crashes.
 *
 * THE STORY:
 * A critical `cart-service` shows slowly degrading performance, with transaction
 * times creeping up. The service intermittently crashes and restarts, after which
 * performance returns to normal, but the cycle of degradation repeats.
 *
 * ROOT CAUSE:
 * A memory leak in the `cart-service` causes heap usage (`jvm.memory.heap.used`)
 * to climb steadily until it triggers a fatal `java.lang.OutOfMemoryError`.
 *
 * TROUBLESHOOTING PATH (OBSERVABILITY UI):
 * 1. Start in the APM UI for the 'cart-service'. Observe the repeating pattern of
 *    gradually increasing latency followed by a sharp drop (indicating a restart).
 * 2. From the service overview, select the "Metrics" tab. Observe the classic
 *    "sawtooth" pattern for 'jvm.memory.heap.used' that correlates with the latency.
 * 3. Pivot to Discover, ensuring the logs data view is selected. Filter for
 *    'service.name: "cart-service"' and 'log.level: "error"'.
 * 4. Find the 'java.lang.OutOfMemoryError' log message that occurs at the peak
 *    of each memory usage spike.
 *
 * TROUBLESHOOTING PATH (PLATFORM TOOLS):
 * 1. On a Dashboard, create a Lens chart using the 'metrics-apm.internal-*' data
 *    view. Plot the average 'jvm.memory.heap.used' for the 'cart-service'. This
 *    will reveal the characteristic "sawtooth" pattern of a memory leak.
 * 2. Add a second Lens chart to the dashboard using the 'traces-apm-*' data view.
 *    Plot the 95th percentile of 'transaction.duration.us'. Observe that the
 *    latency pattern perfectly mirrors the memory usage pattern.
 * 3. Add a third visualization to the dashboard: a Data Table from the 'logs-*'
 *    data view, filtered for 'service.name: "cart-service"' and
 *    'log.level: "error"'.
 * 4. The table will show the 'java.lang.OutOfMemoryError' messages, and selecting
 *    a log entry will highlight the corresponding timestamp on the other charts,
 *    showing it occurs exactly at the peak of the memory usage and latency.
 *
 * AI ASSISTANT QUESTIONS:
 * - "Why does the cart-service keep restarting?"
 * - "Show me the JVM memory usage for the cart-service."
 * - "Are there any errors in the cart-service logs around the time of the crashes?"
 */

import type { ApmFields, LogDocument } from '@kbn/synthtrace-client';
import { apm, log } from '@kbn/synthtrace-client';
import type { Scenario } from '../../cli/scenario';
import { getSynthtraceEnvironment } from '../../lib/utils/get_synthtrace_environment';
import { withClient } from '../../lib/utils/with_client';
import { parseLogsScenarioOpts } from '../helpers/logs_scenario_opts_parser';

const ENVIRONMENT = getSynthtraceEnvironment(__filename);
const SERVICE_NAME = 'cart-service';
const CYCLE_DURATION_MS = 45 * 60 * 1000; // 45 minutes

function getCycleProgress(timestamp: number, range: { from: Date }) {
  const timeIntoCycle = (timestamp - range.from.getTime()) % CYCLE_DURATION_MS;
  return timeIntoCycle / CYCLE_DURATION_MS;
}

function getLatency(progress: number) {
  const baseLatency = 150;
  const addedLatency = progress * 2000; // Max 2s added latency
  return baseLatency + addedLatency;
}

function getHeapUsage(progress: number) {
  // Climbs from 100MB to 900MB
  const heapUsed = 100 + progress * 800;
  return heapUsed * 1024 * 1024; // in bytes
}

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
        const cycleProgress = getCycleProgress(timestamp, range);
        const duration = getLatency(cycleProgress);
        const heapUsed = getHeapUsage(cycleProgress);

        const transaction = cartService
          .transaction({ transactionName: 'POST /cart/add' })
          .timestamp(timestamp)
          .duration(duration)
          .success();

        const metrics = cartService
          .appMetrics({
            'jvm.memory.heap.used': heapUsed,
          })
          .timestamp(timestamp);

        // Crash in the last 10% of the cycle
        const isCrashing = i % 540 < 54; // 10% failure rate
        if (isCrashing) {
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
        const isCrashing = i % 540 < 54;
        if (isCrashing) {
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
