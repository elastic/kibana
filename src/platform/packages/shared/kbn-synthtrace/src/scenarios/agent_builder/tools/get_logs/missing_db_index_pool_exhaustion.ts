/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * SCENARIO: Cascading Failure — Database Connection Pool Exhaustion
 *
 * Story: A missing database index causes full table scans in inventory-service,
 * exhausting its connection pool. This cascades to checkout-service (timeouts
 * calling inventory) and api-gateway (502 errors on checkout endpoints).
 *
 * Timeline (relative to the time range):
 *   0–50%  Normal operation. Steady noise + healthy application logs.
 *   50–60% inventory-service emits connection pool utilization warnings.
 *   60–80% inventory-service errors + checkout-service timeouts.
 *   80–100% api-gateway 502/504 errors join the cascade.
 *
 * Noise layers (present throughout):
 *   - Health checks from all services (high volume)
 *   - Load balancer access logs (high volume)
 *   - fluent-bit metadata merges (moderate)
 *   - Cron / scheduled task logs (low)
 *
 * Red herring:
 *   - notification-service WARN about email delivery delays (unrelated)
 *
 * The agent should:
 *   1. See ~15K+ logs and a visible spike in the incident window
 *   2. Use run_log_rate_analysis — the spike is partial (inventory/checkout
 *      spike while other services stay flat) so LRA can correlate
 *      service.name=inventory-service with the change
 *   3. Use get_log_groups — "Connection pool exhausted" should surface as a
 *      rare pattern among common health-check / access-log noise
 *   4. Funnel with NOT clauses to strip health checks, load balancer, fluent-bit
 *   5. Identify the root cause: missing DB index → full table scans →
 *      pool exhaustion → checkout timeouts → gateway 502s
 *
 * Services:
 *   - api-gateway (production): routes all traffic, emits 502s in cascade phase
 *   - checkout-service (production): order processing, timeout errors
 *   - inventory-service (production): the root-cause service
 *   - payment-service (production): normal throughout (background)
 *   - notification-service (production): normal + unrelated warning (red herring)
 *   - fluent-bit (kube-system): log collector noise
 *   - task-scheduler (kube-system): cron noise
 *
 * Validate via get_logs tool:
 *
 * ```
 * POST kbn:///api/agent_builder/tools/_execute
 * {
 *   "tool_id": "observability.get_logs",
 *   "tool_params": { "start": "now-1h", "end": "now" }
 * }
 * ```
 *
 * Validate via Observability agent (with log search skill):
 *
 * ```
 * POST kbn:///api/agent_builder/converse
 * {
 *   "agent_id": "observability.agent",
 *   "input": "Something is wrong with checkout. Can you investigate the logs?"
 * }
 * ```
 *
 * Test prompts:
 *   1. Vague:    "Something is wrong with checkout. Can you investigate the logs?"
 *   2. Spike:    "There's been a spike in errors in the last 20 minutes. What's causing it?"
 *   3. Scoped:   "The inventory service seems to be having issues. What's going on?"
 */

import type { LogDocument, SynthtraceGenerator, Timerange } from '@kbn/synthtrace-client';
import { log } from '@kbn/synthtrace-client';
import { createCliScenario } from '../../../../lib/utils/create_scenario';
import { withClient, type ScenarioReturnType } from '../../../../lib/utils/with_client';
import type { LogsSynthtraceEsClient } from '../../../../lib/logs/logs_synthtrace_es_client';

const MINUTE = 60 * 1000;

interface TimeWindow {
  start: number;
  end: number;
}

function getIncidentWindows(range: Timerange): {
  warning: TimeWindow;
  incident: TimeWindow;
  cascade: TimeWindow;
} {
  const rangeStart = range.from.getTime();
  const rangeMs = range.to.getTime() - rangeStart;
  return {
    warning: { start: rangeStart + rangeMs * 0.5, end: rangeStart + rangeMs * 0.6 },
    incident: { start: rangeStart + rangeMs * 0.6, end: rangeStart + rangeMs * 0.8 },
    cascade: { start: rangeStart + rangeMs * 0.8, end: rangeStart + rangeMs },
  };
}

function isInWindow(timestamp: number, window: TimeWindow): boolean {
  return timestamp >= window.start && timestamp <= window.end;
}

function isAfter(timestamp: number, point: number): boolean {
  return timestamp >= point;
}

// ---------------------------------------------------------------------------
// Noise generators (high volume, present throughout the entire range)
// ---------------------------------------------------------------------------

function healthCheckLogs(range: Timerange): SynthtraceGenerator<LogDocument> {
  const services = [
    { name: 'api-gateway', host: 'gateway-pod-1', pod: 'gateway-6a7b8c9-xk2m9' },
    { name: 'checkout-service', host: 'checkout-pod-1', pod: 'checkout-7f8b9c-abc12' },
    { name: 'inventory-service', host: 'inventory-pod-1', pod: 'inventory-4d5e6f-qrs89' },
    { name: 'notification-service', host: 'notify-pod-1', pod: 'notify-8g9h0i-tuv34' },
  ];
  return range
    .interval('10s')
    .rate(6)
    .generator((timestamp, index) =>
      log
        .create()
        .message('GET /health 200 OK')
        .logLevel('info')
        .service(services[index % services.length].name)
        .defaults({
          'service.environment': 'production',
          'host.name': services[index % services.length].host,
          'kubernetes.namespace': 'default',
          'kubernetes.pod.name': services[index % services.length].pod,
          'container.name': services[index % services.length].name,
        })
        .timestamp(timestamp)
    );
}

function loadBalancerLogs(range: Timerange): SynthtraceGenerator<LogDocument> {
  const paths = [
    'GET /api/products',
    'GET /api/cart',
    'POST /api/checkout',
    'GET /api/user/profile',
    'GET /favicon.ico',
  ];
  return range
    .interval('10s')
    .rate(10)
    .generator((timestamp, index) =>
      log
        .create()
        .message(`${paths[index % paths.length]} HTTP/1.1 200 via_upstream`)
        .logLevel('info')
        .service('load-balancer')
        .defaults({
          'service.environment': 'production',
          'host.name': 'lb-node-1',
          'kubernetes.namespace': 'ingress',
          'kubernetes.pod.name': 'nginx-ingress-7k2x9',
          'container.name': 'nginx',
        })
        .timestamp(timestamp)
    );
}

function fluentBitLogs(range: Timerange): SynthtraceGenerator<LogDocument> {
  return range
    .interval('15s')
    .rate(4)
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
}

function cronLogs(range: Timerange): SynthtraceGenerator<LogDocument> {
  return range
    .interval('1m')
    .rate(2)
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
}

// ---------------------------------------------------------------------------
// Normal application logs (moderate volume, present throughout)
// ---------------------------------------------------------------------------

function checkoutNormalLogs(range: Timerange): SynthtraceGenerator<LogDocument> {
  return range
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
          'kubernetes.pod.name': 'checkout-7f8b9c-abc12',
          'container.name': 'checkout',
        })
        .timestamp(timestamp)
    );
}

function inventoryNormalLogs(range: Timerange): SynthtraceGenerator<LogDocument> {
  return range
    .interval('30s')
    .rate(3)
    .generator((timestamp, index) =>
      log
        .create()
        .message(`Stock check for product SKU-${1000 + (index % 50)} completed`)
        .logLevel('info')
        .service('inventory-service')
        .defaults({
          'service.environment': 'production',
          'host.name': 'inventory-pod-1',
          'kubernetes.namespace': 'default',
          'kubernetes.pod.name': 'inventory-4d5e6f-qrs89',
          'container.name': 'inventory',
        })
        .timestamp(timestamp)
    );
}

function paymentNormalLogs(range: Timerange): SynthtraceGenerator<LogDocument> {
  return range
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
          'kubernetes.pod.name': 'payment-6c9d8e-def56',
          'container.name': 'payment',
        })
        .timestamp(timestamp)
    );
}

function notificationNormalLogs(range: Timerange): SynthtraceGenerator<LogDocument> {
  return range
    .interval('1m')
    .rate(1)
    .generator((timestamp) =>
      log
        .create()
        .message('Email sent to customer successfully')
        .logLevel('info')
        .service('notification-service')
        .defaults({
          'service.environment': 'production',
          'host.name': 'notify-pod-1',
          'kubernetes.namespace': 'default',
          'kubernetes.pod.name': 'notify-8g9h0i-tuv34',
          'container.name': 'notification',
        })
        .timestamp(timestamp)
    );
}

// ---------------------------------------------------------------------------
// Red herring (low volume, throughout — unrelated to the incident)
// ---------------------------------------------------------------------------

function notificationWarnings(range: Timerange): SynthtraceGenerator<LogDocument> {
  return range
    .interval('5m')
    .rate(1)
    .generator((timestamp) =>
      log
        .create()
        .message('Email delivery delayed, retrying in 30s — SMTP server slow')
        .logLevel('warn')
        .service('notification-service')
        .defaults({
          'service.environment': 'production',
          'host.name': 'notify-pod-1',
          'kubernetes.namespace': 'default',
          'kubernetes.pod.name': 'notify-8g9h0i-tuv34',
          'container.name': 'notification',
        })
        .timestamp(timestamp)
    );
}

// ---------------------------------------------------------------------------
// Signal generators (incident window only)
// ---------------------------------------------------------------------------

function inventoryPoolWarnings(
  range: Timerange,
  window: TimeWindow
): SynthtraceGenerator<LogDocument> {
  const thresholds = [85, 90, 92, 95, 97, 98];
  return range
    .interval('30s')
    .rate(2)
    .generator((timestamp, index) => {
      if (!isInWindow(timestamp, window)) return [];
      const pct = thresholds[Math.min(index % thresholds.length, thresholds.length - 1)];
      return log
        .create()
        .message(
          `Connection pool utilization at ${pct}% (38/${Math.round(
            40 * (pct / 100)
          )} connections in use)`
        )
        .logLevel('warn')
        .service('inventory-service')
        .defaults({
          'service.environment': 'production',
          'host.name': 'inventory-pod-1',
          'kubernetes.namespace': 'default',
          'kubernetes.pod.name': 'inventory-4d5e6f-qrs89',
          'container.name': 'inventory',
        })
        .timestamp(timestamp);
    });
}

function inventoryPoolExhaustedErrors(
  range: Timerange,
  incidentStart: number
): SynthtraceGenerator<LogDocument> {
  return range
    .interval('15s')
    .rate(3)
    .generator((timestamp) => {
      if (!isAfter(timestamp, incidentStart)) return [];
      return log
        .create()
        .message(
          'Connection pool exhausted, cannot acquire connection within 5000ms. Active: 40/40, Idle: 0'
        )
        .logLevel('error')
        .service('inventory-service')
        .defaults({
          'service.environment': 'production',
          'error.message': 'Connection pool exhausted, cannot acquire connection within 5000ms',
          'host.name': 'inventory-pod-1',
          'kubernetes.namespace': 'default',
          'kubernetes.pod.name': 'inventory-4d5e6f-qrs89',
          'container.name': 'inventory',
        })
        .timestamp(timestamp);
    });
}

function inventorySlowQueryErrors(
  range: Timerange,
  incidentStart: number
): SynthtraceGenerator<LogDocument> {
  return range
    .interval('30s')
    .rate(1)
    .generator((timestamp) => {
      if (!isAfter(timestamp, incidentStart)) return [];
      return log
        .create()
        .message(
          'Query timeout after 30000ms: SELECT * FROM products WHERE category_id = 42 (full table scan detected, missing index on category_id)'
        )
        .logLevel('error')
        .service('inventory-service')
        .defaults({
          'service.environment': 'production',
          'error.message': 'Query timeout: full table scan detected, missing index on category_id',
          'host.name': 'inventory-pod-2',
          'kubernetes.namespace': 'default',
          'kubernetes.pod.name': 'inventory-4d5e6f-yz789',
          'container.name': 'inventory',
        })
        .timestamp(timestamp);
    });
}

function checkoutTimeoutErrors(
  range: Timerange,
  incidentStart: number
): SynthtraceGenerator<LogDocument> {
  return range
    .interval('30s')
    .rate(2)
    .generator((timestamp) => {
      if (!isAfter(timestamp, incidentStart)) return [];
      return log
        .create()
        .message(
          'Timeout calling inventory-service after 5000ms: POST /api/inventory/validate-stock'
        )
        .logLevel('error')
        .service('checkout-service')
        .defaults({
          'service.environment': 'production',
          'error.message': 'Timeout calling inventory-service after 5000ms',
          'host.name': 'checkout-pod-1',
          'kubernetes.namespace': 'default',
          'kubernetes.pod.name': 'checkout-7f8b9c-abc12',
          'container.name': 'checkout',
        })
        .timestamp(timestamp);
    });
}

function checkoutStockValidationErrors(
  range: Timerange,
  cascadeStart: number
): SynthtraceGenerator<LogDocument> {
  return range
    .interval('30s')
    .rate(1)
    .generator((timestamp, index) => {
      if (!isAfter(timestamp, cascadeStart - 5 * MINUTE)) return [];
      return log
        .create()
        .message(
          `Failed to validate stock for order #${60000 + index}: inventory-service unavailable`
        )
        .logLevel('error')
        .service('checkout-service')
        .defaults({
          'service.environment': 'production',
          'error.message': 'Failed to validate stock: inventory-service unavailable',
          'host.name': 'checkout-pod-2',
          'kubernetes.namespace': 'default',
          'kubernetes.pod.name': 'checkout-7f8b9c-def34',
          'container.name': 'checkout',
        })
        .timestamp(timestamp);
    });
}

function gatewayErrors(range: Timerange, cascadeStart: number): SynthtraceGenerator<LogDocument> {
  return range
    .interval('15s')
    .rate(2)
    .generator((timestamp, index) => {
      if (!isAfter(timestamp, cascadeStart)) return [];
      const status = index % 3 === 0 ? 504 : 502;
      return log
        .create()
        .message(
          `${status} ${
            status === 504 ? 'Gateway Timeout' : 'Bad Gateway'
          } - POST /api/checkout (upstream: checkout-service)`
        )
        .logLevel('error')
        .service('api-gateway')
        .defaults({
          'service.environment': 'production',
          'error.message': `${status} ${status === 504 ? 'Gateway Timeout' : 'Bad Gateway'}`,
          'host.name': 'gateway-pod-1',
          'kubernetes.namespace': 'default',
          'kubernetes.pod.name': 'gateway-6a7b8c9-xk2m9',
          'container.name': 'api-gateway',
          'http.response.status_code': status,
        })
        .timestamp(timestamp);
    });
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function generateCascadingFailureData({
  range,
  logsEsClient,
}: {
  range: Timerange;
  logsEsClient: LogsSynthtraceEsClient;
}): ScenarioReturnType<LogDocument>[] {
  const windows = getIncidentWindows(range);

  return [
    // Noise
    withClient(logsEsClient, healthCheckLogs(range)),
    withClient(logsEsClient, loadBalancerLogs(range)),
    withClient(logsEsClient, fluentBitLogs(range)),
    withClient(logsEsClient, cronLogs(range)),

    // Normal application logs
    withClient(logsEsClient, checkoutNormalLogs(range)),
    withClient(logsEsClient, inventoryNormalLogs(range)),
    withClient(logsEsClient, paymentNormalLogs(range)),
    withClient(logsEsClient, notificationNormalLogs(range)),

    // Red herring
    withClient(logsEsClient, notificationWarnings(range)),

    // Signal — warning phase
    withClient(logsEsClient, inventoryPoolWarnings(range, windows.warning)),

    // Signal — incident phase
    withClient(logsEsClient, inventoryPoolExhaustedErrors(range, windows.incident.start)),
    withClient(logsEsClient, inventorySlowQueryErrors(range, windows.incident.start)),
    withClient(logsEsClient, checkoutTimeoutErrors(range, windows.incident.start)),

    // Signal — cascade phase
    withClient(logsEsClient, checkoutStockValidationErrors(range, windows.cascade.start)),
    withClient(logsEsClient, gatewayErrors(range, windows.cascade.start)),
  ];
}

export default createCliScenario<LogDocument>(({ range, clients: { logsEsClient } }) =>
  generateCascadingFailureData({ range, logsEsClient })
);
