/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * SCENARIO: Error Groups - APM Errors and OTel Exceptions
 *
 * Story: Generates APM error data across multiple services with different exception types,
 * culprits, and handled/unhandled states. Used to test the `get_error_groups` tool.
 *
 * Services:
 * - `payment-service` (production)
 *   - NullPointerException in PaymentProcessor.processPayment (handled, high volume)
 *   - TimeoutException in PaymentGateway.connect (unhandled, medium volume)
 * - `user-service` (production)
 *   - ValidationException in UserValidator.validate (handled, medium volume)
 *   - DatabaseException in UserRepository.findById (unhandled, low volume)
 * - `order-service` (staging)
 *   - OutOfStockException in InventoryService.reserve (handled, high volume)
 *   - NullPointerException in OrderProcessor.process (unhandled, low volume)
 *
 * Validate via:
 *
 * ```
 * POST kbn:///api/agent_builder/tools/_execute
 * {
 *   "tool_id": "observability.get_error_groups",
 *   "tool_params": {
 *     "start": "now-1h",
 *     "end": "now"
 *   }
 * }
 * ```
 */

import type { ApmFields, Serializable, Timerange } from '@kbn/synthtrace-client';
import { apm } from '@kbn/synthtrace-client';
import { createCliScenario } from '../../../../lib/utils/create_scenario';
import { withClient, type ScenarioReturnType } from '../../../../lib/utils/with_client';
import type { ApmSynthtraceEsClient } from '../../../../lib/apm/client/apm_synthtrace_es_client';

/**
 * Configuration for an error type within a service
 */
export interface ErrorConfig {
  type: string;
  message: string;
  culprit: string;
  handled: boolean;
  /** Rate of this error per interval (errors per minute) */
  rate: number;
}

/**
 * Configuration for a service to generate error data
 */
export interface ErrorServiceConfig {
  name: string;
  environment: string;
  agentName: string;
  transactionName: string;
  errors: ErrorConfig[];
}

/**
 * Generates APM error data for error groups testing.
 * Can be used both by CLI (via default export) and by API tests (via direct import).
 */
export function generateErrorGroupsData({
  range,
  apmEsClient,
  services,
}: {
  range: Timerange;
  apmEsClient: ApmSynthtraceEsClient;
  services: ErrorServiceConfig[];
}): ScenarioReturnType<ApmFields> {
  const data = range.interval('1m').generator((timestamp) =>
    services.flatMap((serviceConfig) => {
      const instance = apm
        .service({
          name: serviceConfig.name,
          environment: serviceConfig.environment,
          agentName: serviceConfig.agentName,
        })
        .instance(`${serviceConfig.name}-instance`);

      return serviceConfig.errors.flatMap((errorConfig) => {
        const events: Array<Serializable<ApmFields>> = [];

        // Generate errors at the specified rate
        for (let i = 0; i < errorConfig.rate; i++) {
          events.push(
            instance
              .transaction({ transactionName: serviceConfig.transactionName })
              .timestamp(timestamp)
              .duration(100)
              .failure()
              .errors(
                instance
                  .error({
                    message: errorConfig.message,
                    type: errorConfig.type,
                    culprit: errorConfig.culprit,
                  })
                  .timestamp(timestamp)
              )
          );
        }

        return events;
      });
    })
  );

  return withClient(apmEsClient, data);
}

export default createCliScenario(({ range, clients: { apmEsClient } }) => {
  const services: ErrorServiceConfig[] = [
    // Service 1: payment-service in production with various payment errors
    {
      name: 'payment-service',
      environment: 'production',
      agentName: 'java',
      transactionName: 'POST /api/payment',
      errors: [
        {
          type: 'NullPointerException',
          message: 'Cannot invoke method on null object in payment processing',
          culprit: 'com.example.payment.PaymentProcessor.processPayment',
          handled: true,
          rate: 5, // High volume
        },
        {
          type: 'TimeoutException',
          message: 'Connection to payment gateway timed out after 30000ms',
          culprit: 'com.example.payment.PaymentGateway.connect',
          handled: false,
          rate: 2, // Medium volume
        },
      ],
    },
    // Service 2: user-service in production with validation and database errors
    {
      name: 'user-service',
      environment: 'production',
      agentName: 'nodejs',
      transactionName: 'GET /api/user',
      errors: [
        {
          type: 'ValidationException',
          message: 'Invalid email format: user@',
          culprit: 'UserValidator.validate at src/validators/user.js:42',
          handled: true,
          rate: 3, // Medium volume
        },
        {
          type: 'DatabaseException',
          message: 'Connection pool exhausted, unable to acquire connection',
          culprit: 'UserRepository.findById at src/repositories/user.js:15',
          handled: false,
          rate: 1, // Low volume
        },
      ],
    },
    // Service 3: order-service in staging with inventory and processing errors
    {
      name: 'order-service',
      environment: 'staging',
      agentName: 'python',
      transactionName: 'POST /api/order',
      errors: [
        {
          type: 'OutOfStockException',
          message: 'Product SKU-12345 is out of stock',
          culprit: 'inventory_service.reserve in app/services/inventory.py:87',
          handled: true,
          rate: 4, // High volume
        },
        {
          type: 'NullPointerException',
          message: 'Order items list is None',
          culprit: 'order_processor.process in app/processors/order.py:23',
          handled: false,
          rate: 1, // Low volume
        },
      ],
    },
  ];

  return generateErrorGroupsData({ range, apmEsClient, services });
});
