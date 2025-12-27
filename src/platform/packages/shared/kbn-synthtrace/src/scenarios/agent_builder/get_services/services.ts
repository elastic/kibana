/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * SCENARIO: Generated Services
 *
 * Story: Generates multiple services in different environments (production, staging, development)
 * to verify `get_services` tool and its filtering capabilities.
 *
 * - `checkout-service` (production, nodejs)
 * - `payment-service` (production, java) - 50% error rate
 * - `frontend` (staging, rum-js)
 * - `experimental-service` (development, ruby)
 *
 * Validate via:
 *
 * ```
 * POST kbn:///api/agent_builder/tools/_execute
 * {
 *   "tool_id": "observability.get_services",
 *   "tool_params": {
 *     "start": "now-1h",
 *     "end": "now"
 *   }
 * }
 * ```
 */

import type { ApmFields } from '@kbn/synthtrace-client';
import { apm } from '@kbn/synthtrace-client';
import type { Scenario } from '../../../cli/scenario';
import { withClient } from '../../../lib/utils/with_client';

const scenario: Scenario<ApmFields> = async (runOptions) => {
  return {
    generate: ({ range, clients: { apmEsClient } }) => {
      const checkoutService = apm
        .service('checkout-service', 'production', 'nodejs')
        .instance('checkout-01');

      const paymentService = apm
        .service('payment-service', 'production', 'java')
        .instance('payment-01');

      const frontendService = apm.service('frontend', 'staging', 'rum-js').instance('browser-01');

      const devService = apm
        .service('experimental-service', 'development', 'ruby')
        .instance('dev-01');

      const data = range
        .interval('1m')
        .rate(1)
        .generator((timestamp) => {
          // Checkout service - healthy
          const checkoutDocs = [
            checkoutService
              .transaction('POST /api/checkout', 'request')
              .timestamp(timestamp)
              .duration(150)
              .outcome('success'),
          ];

          // Payment service - unhealthy (high error rate)
          const isError = Math.random() < 0.5; // 50% error rate
          const paymentDocs = [
            paymentService
              .transaction('POST /api/pay', 'request')
              .timestamp(timestamp)
              .duration(isError ? 500 : 200)
              .outcome(isError ? 'failure' : 'success'),
          ];

          // Frontend service - healthy, staging
          const frontendDocs = [
            frontendService
              .transaction('PAGE_LOAD /home', 'page-load')
              .timestamp(timestamp)
              .duration(500)
              .outcome('success'),
          ];

          // Development service
          const devDocs = [
            devService
              .transaction('GET /test', 'request')
              .timestamp(timestamp)
              .duration(200)
              .outcome('success'),
          ];

          return [...checkoutDocs, ...paymentDocs, ...frontendDocs, ...devDocs];
        });

      return withClient(apmEsClient, data);
    },
  };
};

export default scenario;
