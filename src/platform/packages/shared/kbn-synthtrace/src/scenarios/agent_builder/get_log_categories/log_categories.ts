/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * SCENARIO: Generated Log Categories
 *
 * Story: Generates diverse log patterns for `payment-service` to verify `get_log_categories`.
 *
 * Patterns:
 * - "Processing payment transaction for order #..." (Info, Frequent, High Cardinality)
 * - "Payment transaction completed successfully" (Info, Frequent, Low Cardinality)
 * - "Payment processing failed: connection timeout" (Error, Occasional)
 * - "Payment gateway response time exceeded threshold" (Warn, Occasional)
 * - "Debug: Payment API called with request_id=..." (Debug, Very Frequent, High Cardinality)
 *
 * Validate via:
 *
 * ```
 * POST kbn:///api/agent_builder/tools/_execute
 * {
 *   "tool_id": "observability.get_log_categories",
 *   "tool_params": {
 *     "start": "now-1h",
 *     "end": "now",
 *     "terms": {
 *       "service.name": "payment-service"
 *     }
 *   }
 * }
 * ```
 */

import type { LogDocument } from '@kbn/synthtrace-client';
import { log } from '@kbn/synthtrace-client';
import type { Scenario } from '../../../cli/scenario';
import { withClient } from '../../../lib/utils/with_client';

const scenario: Scenario<LogDocument> = async (runOptions) => {
  return {
    generate: ({ range, clients: { logsEsClient } }) => {
      const serviceName = 'payment-service';

      // Create multiple log patterns for categorization
      const paymentProcessingLogs = range
        .interval('30s')
        .rate(5)
        .generator((timestamp, index) =>
          log
            .create()
            .message(`Processing payment transaction for order #${10000 + index}`)
            .logLevel('info')
            .service(serviceName)
            .defaults({
              'service.name': serviceName,
              'log.level': 'info',
            })
            .timestamp(timestamp)
        );

      const paymentCompleteLogs = range
        .interval('30s')
        .rate(5)
        .generator((timestamp) =>
          log
            .create()
            .message('Payment transaction completed successfully')
            .logLevel('info')
            .service(serviceName)
            .defaults({
              'service.name': serviceName,
              'log.level': 'info',
            })
            .timestamp(timestamp)
        );

      const errorLogs = range
        .interval('2m')
        .rate(2)
        .generator((timestamp) =>
          log
            .create()
            .message('Payment processing failed: connection timeout')
            .logLevel('error')
            .service(serviceName)
            .defaults({
              'service.name': serviceName,
              'log.level': 'error',
            })
            .timestamp(timestamp)
        );

      const warningLogs = range
        .interval('1m')
        .rate(3)
        .generator((timestamp) =>
          log
            .create()
            .message('Payment gateway response time exceeded threshold')
            .logLevel('warn')
            .service(serviceName)
            .defaults({
              'service.name': serviceName,
              'log.level': 'warn',
            })
            .timestamp(timestamp)
        );

      const debugLogs = range
        .interval('15s')
        .rate(10)
        .generator((timestamp, index) =>
          log
            .create()
            .message(
              `Debug: Payment API called with request_id=${Math.random()
                .toString(36)
                .substring(2, 8)}`
            )
            .logLevel('debug')
            .service(serviceName)
            .defaults({
              'service.name': serviceName,
              'log.level': 'debug',
            })
            .timestamp(timestamp)
        );

      return withClient(logsEsClient, [
        paymentProcessingLogs,
        paymentCompleteLogs,
        errorLogs,
        warningLogs,
        debugLogs,
      ]);
    },
  };
};

export default scenario;
