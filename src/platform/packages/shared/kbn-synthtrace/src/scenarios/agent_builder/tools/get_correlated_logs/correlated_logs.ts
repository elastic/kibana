/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * SCENARIO: Correlated Logs for get_correlated_logs tool
 *
 * Generates log sequences linked by correlation identifiers.
 * Each sequence contains logs with a shared correlation ID and at least one anchor log (error/warning).
 *
 * CLI Usage:
 * ```
 * node scripts/synthtrace src/platform/packages/shared/kbn-synthtrace/src/scenarios/agent_builder/tools/get_correlated_logs/correlated_logs.ts \
 *   --from "now-1h" --to "now" --clean --workers=1
 * ```
 *
 * API Test Usage:
 * ```typescript
 * await indexCorrelatedLogs({
 *   logsEsClient,
 *   logs: [
 *     { 'log.level': 'info', message: 'Request started', 'service.name': 'my-service', 'trace.id': 'abc123' },
 *     { 'log.level': 'error', message: 'Request failed', 'service.name': 'my-service', 'trace.id': 'abc123' },
 *   ],
 * });
 * ```
 */

import type { LogDocument, Timerange } from '@kbn/synthtrace-client';
import { log } from '@kbn/synthtrace-client';
import type { Scenario } from '../../../../cli/scenario';
import { withClient, type ScenarioReturnType } from '../../../../lib/utils/with_client';
import { IndexTemplateName } from '../../../../lib/logs/custom_logsdb_index_templates';
import type { LogsSynthtraceEsClient } from '../../../../lib/logs/logs_synthtrace_es_client';

/**
 * A log event with any fields. Minimal required field is `message`.
 * All other fields (severity, correlation IDs, service info) are optional.
 */
export interface CorrelatedLogEvent {
  message: string;
  '@timestamp'?: number;
  [key: string]: unknown;
}

/**
 * A minimal log entry for use with createLogSequence.
 * Only requires message; all other fields are optional.
 */
export interface LogEntry {
  message: string;
  [key: string]: unknown;
}

/**
 * Generates correlated log data.
 *
 * @param range - Time range for log generation
 * @param logsEsClient - Synthtrace ES client
 * @param logs - Optional array of log events. If not provided, generates default realistic sequences.
 */
export function generateCorrelatedLogsData({
  range,
  logsEsClient,
  logs,
}: {
  range: Timerange;
  logsEsClient: LogsSynthtraceEsClient;
  logs?: CorrelatedLogEvent[];
}): ScenarioReturnType<LogDocument> {
  const data = range
    .interval('5m')
    .rate(1)
    .generator((timestamp) => {
      // Use custom logs if provided (API tests), otherwise generate default sequences (CLI)
      const events = logs ?? generateDefaultSequences(timestamp);

      return events.map((event, index) => {
        const { message, '@timestamp': eventTimestamp, ...fields } = event;

        return log
          .create()
          .message(message)
          .defaults(fields)
          .timestamp(eventTimestamp ?? timestamp + index * 10000);
      });
    });

  return withClient(logsEsClient, data);
}

/**
 * Generates realistic log sequences for CLI usage.
 * Creates multiple independent sequences with different:
 * - Services (payment, order, auth, shipping)
 * - Correlation types (trace.id, request.id, session.id)
 * - Severity patterns (some with errors, some with warnings)
 */
function generateDefaultSequences(baseTimestamp: number): CorrelatedLogEvent[] {
  return [
    // Sequence 1: Payment failure (trace.id correlation)
    ...createLogSequence({
      service: 'payment-service',
      correlation: { 'trace.id': `trace-payment-${baseTimestamp}` },
      logs: [
        { 'log.level': 'info', message: 'Payment request received', '@timestamp': baseTimestamp },
        {
          'log.level': 'info',
          message: 'Validating card details',
          '@timestamp': baseTimestamp + 100,
        },
        {
          'log.level': 'info',
          message: 'Contacting payment gateway',
          '@timestamp': baseTimestamp + 200,
        },
        {
          'log.level': 'error',
          message: 'Payment gateway timeout after 30s',
          '@timestamp': baseTimestamp + 30200,
        },
        {
          'log.level': 'warn',
          message: 'Initiating retry (attempt 2/3)',
          '@timestamp': baseTimestamp + 30300,
        },
        {
          'log.level': 'info',
          message: 'Payment succeeded on retry',
          '@timestamp': baseTimestamp + 32000,
        },
      ],
    }),

    // Sequence 2: Order processing (request.id correlation)
    ...createLogSequence({
      service: 'order-service',
      correlation: { 'request.id': `req-order-${baseTimestamp}` },
      logs: [
        { 'log.level': 'info', message: 'Order created', '@timestamp': baseTimestamp + 5000 },
        {
          'log.level': 'info',
          message: 'Inventory check passed',
          '@timestamp': baseTimestamp + 5100,
        },
        { 'log.level': 'info', message: 'Order confirmed', '@timestamp': baseTimestamp + 5200 },
      ],
    }),

    // Sequence 3: Auth failure (session.id correlation)
    ...createLogSequence({
      service: 'auth-service',
      correlation: { 'session.id': `session-auth-${baseTimestamp}` },
      logs: [
        {
          'log.level': 'info',
          message: 'Login attempt started',
          '@timestamp': baseTimestamp + 10000,
        },
        {
          'log.level': 'warn',
          message: 'Invalid password (attempt 1/3)',
          '@timestamp': baseTimestamp + 10100,
        },
        {
          'log.level': 'warn',
          message: 'Invalid password (attempt 2/3)',
          '@timestamp': baseTimestamp + 12000,
        },
        {
          'log.level': 'error',
          message: 'Account locked after 3 failed attempts',
          '@timestamp': baseTimestamp + 14000,
        },
      ],
    }),

    // Sequence 4: Shipping error (transaction.id correlation)
    ...createLogSequence({
      service: 'shipping-service',
      correlation: { 'transaction.id': `txn-ship-${baseTimestamp}` },
      logs: [
        {
          'log.level': 'info',
          message: 'Shipping label generation started',
          '@timestamp': baseTimestamp + 20000,
        },
        {
          'log.level': 'info',
          message: 'Address validation passed',
          '@timestamp': baseTimestamp + 20100,
        },
        {
          'log.level': 'error',
          message: 'Carrier API returned 503 Service Unavailable',
          '@timestamp': baseTimestamp + 20200,
        },
        {
          'log.level': 'info',
          message: 'Fallback to secondary carrier',
          '@timestamp': baseTimestamp + 20300,
        },
        {
          'log.level': 'info',
          message: 'Shipping label generated successfully',
          '@timestamp': baseTimestamp + 20500,
        },
      ],
    }),

    // Sequence 5: Notification service (correlation.id)
    ...createLogSequence({
      service: 'notification-service',
      correlation: { 'correlation.id': `corr-notify-${baseTimestamp}` },
      logs: [
        {
          'log.level': 'info',
          message: 'Email notification queued',
          '@timestamp': baseTimestamp + 25000,
        },
        {
          'log.level': 'info',
          message: 'Email sent successfully',
          '@timestamp': baseTimestamp + 25500,
        },
      ],
    }),

    // Sequence 6: Database error (span.id correlation)
    ...createLogSequence({
      service: 'inventory-service',
      correlation: { 'span.id': `span-db-${baseTimestamp}` },
      logs: [
        {
          'log.level': 'info',
          message: 'Database query started',
          '@timestamp': baseTimestamp + 30000,
        },
        {
          'log.level': 'warn',
          message: 'Query taking longer than expected (>5s)',
          '@timestamp': baseTimestamp + 35000,
        },
        {
          'log.level': 'error',
          message: 'Database connection pool exhausted',
          '@timestamp': baseTimestamp + 40000,
        },
        {
          'log.level': 'info',
          message: 'Connection recovered after pool expansion',
          '@timestamp': baseTimestamp + 42000,
        },
      ],
    }),
  ];
}

/**
 * Creates a sequence of correlated log events with shared fields.
 * Reduces boilerplate in API tests by applying common fields to all logs.
 *
 * @example
 * // Basic usage with ECS log.level
 * createLogSequence({
 *   service: 'payment-service',
 *   correlation: { 'trace.id': 'trace-123' },
 *   logs: [
 *     { 'log.level': 'info', message: 'Request started' },
 *     { 'log.level': 'error', message: 'Request failed' },
 *   ],
 * });
 *
 * @example
 * // With alternative severity format (syslog)
 * createLogSequence({
 *   service: 'syslog-service',
 *   correlation: { 'trace.id': 'trace-456' },
 *   logs: [
 *     { message: 'Request started', 'syslog.severity': 6 },  // info
 *     { message: 'Request failed', 'syslog.severity': 3 },   // error
 *   ],
 * });
 *
 * @example
 * // With custom correlation field
 * createLogSequence({
 *   service: 'order-service',
 *   correlation: { order_id: 'ORD-789' },
 *   logs: [
 *     { 'log.level': 'info', message: 'Order created' },
 *     { 'log.level': 'error', message: 'Order failed' },
 *   ],
 * });
 */
export function createLogSequence({
  service,
  correlation,
  logs,
  defaults = {},
}: {
  /** Service name (maps to service.name) */
  service: string;
  /** Correlation field(s) shared by all logs, e.g. { 'trace.id': 'abc' } or { order_id: '123' } */
  correlation: Record<string, string>;
  /** Log entries - each must have `message`, other fields are optional */
  logs: LogEntry[];
  /** Additional fields to apply to all logs */
  defaults?: Record<string, unknown>;
}): CorrelatedLogEvent[] {
  return logs.map((entry) => ({
    'service.name': service,
    ...correlation,
    ...defaults,
    ...entry,
  }));
}

const scenario: Scenario<LogDocument> = async () => ({
  bootstrap: async ({ logsEsClient }) => {
    await logsEsClient.createIndexTemplate(IndexTemplateName.LogsDb);
  },
  generate: ({ range, clients: { logsEsClient } }) =>
    generateCorrelatedLogsData({ range, logsEsClient }),
});

export default scenario;
