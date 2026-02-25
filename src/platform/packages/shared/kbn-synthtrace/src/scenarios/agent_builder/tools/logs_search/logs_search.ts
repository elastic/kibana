/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * SCENARIO: Logs Search — Noise + Error Spike
 *
 * Story: Generates realistic log data for testing the `logs_search` agentic tool.
 * The data simulates a production environment where:
 *
 * - Background noise: health checks, cron jobs, routine access logs (high volume)
 * - Normal service logs: info-level application messages from checkout, user, payment services
 * - Error spike: a burst of OOM and connection timeout errors from the checkout service
 *   concentrated in a ~10 minute window within the time range
 *
 * The agent should be able to:
 * 1. See the high volume of noise in the initial peek
 * 2. Filter out health checks and cron jobs
 * 3. Notice the error spike in the histogram
 * 4. Drill down to the checkout service OOM errors
 * 5. Identify the root cause (memory exhaustion in checkout pods)
 *
 * Services:
 * - checkout-service (production): The failing service with OOM errors
 * - payment-service (production): Normal operation, some routine warnings
 * - user-service (production): Normal operation
 * - fluent-bit (kube-system): Log collector noise
 *
 * Validate via:
 *
 * ```
 * POST kbn:///api/agent_builder/tools/_execute
 * {
 *   "tool_id": "observability.logs_search",
 *   "tool_params": {
 *     "prompt": "Why are there errors in the checkout service?",
 *     "start": "now-1h",
 *     "end": "now"
 *   }
 * }
 * ```
 */

import type { LogDocument, Timerange } from '@kbn/synthtrace-client';
import { log } from '@kbn/synthtrace-client';
import { createCliScenario } from '../../../../lib/utils/create_scenario';
import { withClient, type ScenarioReturnType } from '../../../../lib/utils/with_client';
import type { LogsSynthtraceEsClient } from '../../../../lib/logs/logs_synthtrace_es_client';

export function generateLogsSearchData({
  range,
  logsEsClient,
}: {
  range: Timerange;
  logsEsClient: LogsSynthtraceEsClient;
}): ScenarioReturnType<LogDocument>[] {
  const healthCheckLogs = range
    .interval('10s')
    .rate(8)
    .generator((timestamp) =>
      log
        .create()
        .message('GET /health 200 OK')
        .logLevel('info')
        .service('checkout-service')
        .defaults({
          'service.environment': 'production',
          'host.name': 'checkout-pod-1',
          'kubernetes.namespace': 'default',
          'kubernetes.pod.name': 'checkout-7f8b9c4d5-xk2m9',
          'container.name': 'checkout',
        })
        .timestamp(timestamp)
    );

  const cronLogs = range
    .interval('1m')
    .rate(3)
    .generator((timestamp) =>
      log
        .create()
        .message('CRON: Running scheduled cleanup task')
        .logLevel('info')
        .service('task-scheduler')
        .defaults({
          'service.environment': 'production',
          'host.name': 'scheduler-host-1',
          'kubernetes.namespace': 'kube-system',
          'kubernetes.pod.name': 'scheduler-5c8f7d-9xmn4',
          'container.name': 'scheduler',
        })
        .timestamp(timestamp)
    );

  const fluentBitLogs = range
    .interval('15s')
    .rate(5)
    .generator((timestamp) =>
      log
        .create()
        .message('[filter:kubernetes:kubernetes.0] Merged new pod metadata')
        .logLevel('info')
        .service('fluent-bit')
        .defaults({
          'service.environment': 'production',
          'host.name': 'fluent-bit-node-1',
          'kubernetes.namespace': 'kube-system',
          'kubernetes.pod.name': 'fluent-bit-ds-7k2x9',
          'container.name': 'fluent-bit',
        })
        .timestamp(timestamp)
    );

  const checkoutNormalLogs = range
    .interval('30s')
    .rate(3)
    .generator((timestamp, index) =>
      log
        .create()
        .message(`Processing order #${50000 + index} for customer`)
        .logLevel('info')
        .service('checkout-service')
        .defaults({
          'service.environment': 'production',
          'host.name': 'checkout-pod-1',
          'kubernetes.namespace': 'default',
          'kubernetes.pod.name': 'checkout-7f8b9c4d5-xk2m9',
          'container.name': 'checkout',
        })
        .timestamp(timestamp)
    );

  const paymentNormalLogs = range
    .interval('30s')
    .rate(2)
    .generator((timestamp) =>
      log
        .create()
        .message('Payment processed successfully')
        .logLevel('info')
        .service('payment-service')
        .defaults({
          'service.environment': 'production',
          'host.name': 'payment-pod-1',
          'kubernetes.namespace': 'default',
          'kubernetes.pod.name': 'payment-6c9d8e5f7-abc12',
          'container.name': 'payment',
        })
        .timestamp(timestamp)
    );

  const userServiceLogs = range
    .interval('20s')
    .rate(2)
    .generator((timestamp) =>
      log
        .create()
        .message('User session validated')
        .logLevel('info')
        .service('user-service')
        .defaults({
          'service.environment': 'production',
          'host.name': 'user-pod-1',
          'kubernetes.namespace': 'default',
          'kubernetes.pod.name': 'user-4b7c6d5e-qrs89',
          'container.name': 'user',
        })
        .timestamp(timestamp)
    );

  const paymentWarnings = range
    .interval('5m')
    .rate(1)
    .generator((timestamp) =>
      log
        .create()
        .message('Payment gateway response time exceeded 2s threshold')
        .logLevel('warn')
        .service('payment-service')
        .defaults({
          'service.environment': 'production',
          'host.name': 'payment-pod-1',
          'kubernetes.namespace': 'default',
          'kubernetes.pod.name': 'payment-6c9d8e5f7-abc12',
          'container.name': 'payment',
        })
        .timestamp(timestamp)
    );

  const oomErrors = range
    .interval('15s')
    .rate(1)
    .generator((timestamp) => {
      const rangeMs = range.end.getTime() - range.start.getTime();
      const spikeStart = range.start.getTime() + rangeMs * 0.5;
      const spikeEnd = spikeStart + 10 * 60 * 1000;

      if (timestamp < spikeStart || timestamp > spikeEnd) {
        return [];
      }

      return [
        log
          .create()
          .message(
            'java.lang.OutOfMemoryError: Java heap space at com.checkout.CartService.loadCart(CartService.java:142)'
          )
          .logLevel('error')
          .service('checkout-service')
          .defaults({
            'service.environment': 'production',
            'error.message': 'Java heap space',
            'host.name': 'checkout-pod-2',
            'kubernetes.namespace': 'default',
            'kubernetes.pod.name': 'checkout-7f8b9c4d5-yz789',
            'container.name': 'checkout',
            'container.id': 'abc123def456',
          })
          .timestamp(timestamp),
        log
          .create()
          .message(
            'java.lang.OutOfMemoryError: Java heap space at com.checkout.CartService.loadCart(CartService.java:142)'
          )
          .logLevel('error')
          .service('checkout-service')
          .defaults({
            'service.environment': 'production',
            'error.message': 'Java heap space',
            'host.name': 'checkout-pod-1',
            'kubernetes.namespace': 'default',
            'kubernetes.pod.name': 'checkout-7f8b9c4d5-xk2m9',
            'container.name': 'checkout',
            'container.id': 'def789ghi012',
          })
          .timestamp(timestamp + 2000),
      ];
    });

  const connectionTimeouts = range
    .interval('30s')
    .rate(1)
    .generator((timestamp) => {
      const rangeMs = range.end.getTime() - range.start.getTime();
      const spikeStart = range.start.getTime() + rangeMs * 0.5;
      const spikeEnd = spikeStart + 10 * 60 * 1000;

      if (timestamp < spikeStart || timestamp > spikeEnd) {
        return [];
      }

      return log
        .create()
        .message(
          'Connection to redis-master:6379 timed out after 5000ms - circuit breaker OPEN'
        )
        .logLevel('error')
        .service('checkout-service')
        .defaults({
          'service.environment': 'production',
          'error.message': 'Connection timed out after 5000ms',
          'host.name': 'checkout-pod-2',
          'kubernetes.namespace': 'default',
          'kubernetes.pod.name': 'checkout-7f8b9c4d5-yz789',
          'container.name': 'checkout',
          'container.id': 'abc123def456',
        })
        .timestamp(timestamp);
    });

  return [
    withClient(logsEsClient, healthCheckLogs),
    withClient(logsEsClient, cronLogs),
    withClient(logsEsClient, fluentBitLogs),
    withClient(logsEsClient, checkoutNormalLogs),
    withClient(logsEsClient, paymentNormalLogs),
    withClient(logsEsClient, userServiceLogs),
    withClient(logsEsClient, paymentWarnings),
    withClient(logsEsClient, oomErrors),
    withClient(logsEsClient, connectionTimeouts),
  ];
}

export default createCliScenario<LogDocument>(
  ({ range, clients: { logsEsClient } }) => {
    const results = generateLogsSearchData({ range, logsEsClient });
    return results;
  }
);
