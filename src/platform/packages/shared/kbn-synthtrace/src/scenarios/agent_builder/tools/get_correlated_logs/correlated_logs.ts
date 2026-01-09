/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * SCENARIO: Generated Correlated Logs
 *
 * Story: Generates log sequences linked by correlation IDs (trace.id) and custom identifiers (order_id).
 *
 * Sequence 1 (Standard Correlation):
 * - "Transaction started" (Info)
 * - "Payment failed" (Error) -> Anchor
 * - "Rollback initiated" (Info)
 *
 * Sequence 2 (Custom Correlation):
 * - "Order placed" (Info)
 * - "Shipping failed" (Error) -> Anchor
 *
 * Validate via:
 *
 * ```
 * POST kbn:///api/agent_builder/tools/_execute
 * {
 *   "tool_id": "observability.get_correlated_logs",
 *   "tool_params": {
 *     "start": "now-1h",
 *     "end": "now"
 *   }
 * }
 * ```
 *
 * And for custom fields:
 *
 * ```
 * POST kbn:///api/agent_builder/tools/_execute
 * {
 *   "tool_id": "observability.get_correlated_logs",
 *   "tool_params": {
 *     "start": "now-1h",
 *     "end": "now",
 *     "correlationFields": ["order_id"]
 *   }
 * }
 * ```
 */

import type { LogDocument, Timerange } from '@kbn/synthtrace-client';
import { log } from '@kbn/synthtrace-client';
import type { Scenario } from '../../../../cli/scenario';
import { withClient, type ScenarioReturnType } from '../../../../lib/utils/with_client';
import { IndexTemplateName } from '../../../../lib/logs/custom_logsdb_index_templates';
import type { LogsSynthtraceEsClient } from '../../../../lib/logs/logs_synthtrace_es_client';

/**
 * Configuration for a log event in a correlated sequence
 */
export interface CorrelatedLogEvent {
  level: string;
  message: string;
  '@timestamp'?: number;
  [key: string]: unknown;
}

/**
 * Generates correlated log data with trace.id and custom correlation fields.
 * Can be used both by CLI (via default export) and by API tests (via direct import).
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
    .interval('5m') // Less frequent to make it easier to see
    .rate(1)
    .generator((timestamp) => {
      // If custom logs are provided, use them
      if (logs) {
        return logs.map((event, index) => {
          const { level, message, '@timestamp': eventTimestamp, ...logAttributes } = event;
          return log
            .create()
            .message(message)
            .logLevel(level.toUpperCase())
            .defaults(logAttributes)
            .timestamp(eventTimestamp ?? timestamp + index * 10000);
        });
      }

      // Default: generate standard correlated log sequences
      const traceId = `trace-${timestamp}`;
      const orderId = `ORD-${timestamp}`;

      const traceDocs = [
        log
          .create()
          .service('payment-service')
          .message('Transaction started')
          .logLevel('info')
          .defaults({ 'trace.id': traceId })
          .timestamp(timestamp),

        log
          .create()
          .service('payment-service')
          .message('Processing payment')
          .logLevel('info')
          .defaults({ 'trace.id': traceId })
          .timestamp(timestamp + 100),

        log
          .create()
          .service('payment-service')
          .message('Payment failed')
          .logLevel('error')
          .defaults({ 'trace.id': traceId })
          .timestamp(timestamp + 200),

        log
          .create()
          .service('payment-service')
          .message('Rollback initiated')
          .logLevel('info')
          .defaults({ 'trace.id': traceId })
          .timestamp(timestamp + 300),
      ];

      const customDocs = [
        log
          .create()
          .service('order-service')
          .message('Order placed')
          .logLevel('info')
          .defaults({
            // @ts-expect-error
            order_id: orderId,
          })
          .timestamp(timestamp + 1000),

        log
          .create()
          .service('shipping-service')
          .message('Shipping label generation failed')
          .logLevel('error')
          .defaults({
            // @ts-expect-error
            order_id: orderId,
          })
          .timestamp(timestamp + 2000),
      ];

      return [...traceDocs, ...customDocs];
    });

  return withClient(logsEsClient, data);
}

const scenario: Scenario<LogDocument> = async () => ({
  bootstrap: async ({ logsEsClient }) => {
    await logsEsClient.createIndexTemplate(IndexTemplateName.LogsDb);
  },
  generate: ({ range, clients: { logsEsClient } }) =>
    generateCorrelatedLogsData({ range, logsEsClient }),
});

export default scenario;
