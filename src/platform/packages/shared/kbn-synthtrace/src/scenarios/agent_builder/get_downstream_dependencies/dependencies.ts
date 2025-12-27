/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * SCENARIO: Generated Dependencies
 *
 * Story: Generates downstream dependencies for `checkout-service`.
 *
 * Dependencies:
 * - `payment-gateway` (HTTP)
 * - `postgres` (DB)
 * - `kafka` (Messaging)
 *
 * Validate via:
 *
 * ```
 * POST kbn:///api/agent_builder/tools/_execute
 * {
 *   "tool_id": "observability.get_downstream_dependencies",
 *   "tool_params": {
 *     "start": "now-1h",
 *     "end": "now",
 *     "serviceName": "checkout-service"
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

      const data = range
        .interval('1m')
        .rate(1)
        .generator((timestamp) => {
          return [
            checkoutService
              .transaction('POST /api/checkout', 'request')
              .timestamp(timestamp)
              .duration(200)
              .success()
              .children(
                // HTTP Dependency
                checkoutService
                  .span('POST https://payment.gateway/charge', 'external', 'http')
                  .destination('payment-gateway')
                  .timestamp(timestamp + 10)
                  .duration(100)
                  .success(),

                // DB Dependency
                checkoutService
                  .span('SELECT FROM orders', 'db', 'postgresql')
                  .destination('postgres')
                  .timestamp(timestamp + 120)
                  .duration(20)
                  .success(),

                // Messaging Dependency
                checkoutService
                  .span('orders', 'messaging', 'kafka')
                  .destination('kafka')
                  .timestamp(timestamp + 150)
                  .duration(10)
                  .success()
              ),
          ];
        });

      return withClient(apmEsClient, data);
    },
  };
};

export default scenario;
