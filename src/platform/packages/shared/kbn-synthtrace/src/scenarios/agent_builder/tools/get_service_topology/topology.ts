/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * SCENARIO: Service Topology
 *
 * Generates a multi-hop service topology with instrumented services and
 * uninstrumented dependencies (databases, caches, message queues).
 *
 * IMPORTANT: The span.destination.service.resource values intentionally differ from
 * the service.name values (e.g., "checkout-proxy:5050" instead of "checkout-service").
 * This prevents tests from passing if someone reintroduces heuristic matching on
 * span.destination.service.resource. The implementation must rely on resolved
 * target['service.name'] (from the parent.id → span.id join between instrumented services).
 *
 * Topology:
 *
 *   frontend (nodejs)
 *     → checkout-service (java) [destination: "checkout-proxy:5050"]
 *         → postgres (db)
 *         → redis (cache)
 *         → kafka (messaging)
 *     → recommendation-service (python) [destination: "recommendation-lb:8080"]
 *         → postgres (db)
 *
 * Validate via:
 *
 * ```
 * POST kbn:///api/agent_builder/tools/_execute
 * {
 *   "tool_id": "observability.get_service_topology",
 *   "tool_params": {
 *     "start": "now-1h",
 *     "end": "now",
 *     "serviceName": "frontend"
 *   }
 * }
 * ```
 */

import type { ApmFields, Timerange } from '@kbn/synthtrace-client';
import { apm } from '@kbn/synthtrace-client';
import { createCliScenario } from '../../../../lib/utils/create_scenario';
import { withClient, type ScenarioReturnType } from '../../../../lib/utils/with_client';
import type { ApmSynthtraceEsClient } from '../../../../lib/apm/client/apm_synthtrace_es_client';

// NOTE: These resource names intentionally differ from service.name to prevent
// heuristic matching from accidentally passing tests. See scenario comment above.
export const FRONTEND_SERVICE = {
  serviceName: 'frontend',
} as const;

export const CHECKOUT_SERVICE = {
  serviceName: 'checkout-service',
  resource: 'checkout-proxy:5050',
} as const;

const EXTERNAL_HTTP_SPAN = {
  spanType: 'external',
  spanSubtype: 'http',
} as const;

export const RECOMMENDATION_SERVICE = {
  serviceName: 'recommendation-service',
  resource: 'recommendation-lb:8080',
} as const;

export const POSTGRES_DEPENDENCY = {
  resource: 'postgres',
  spanType: 'db',
  spanSubtype: 'postgresql',
} as const;

export const REDIS_DEPENDENCY = {
  resource: 'redis',
  spanType: 'db',
  spanSubtype: 'redis',
} as const;

export const KAFKA_DEPENDENCY = {
  resource: 'kafka',
  spanType: 'messaging',
  spanSubtype: 'kafka',
} as const;

export function generateTopologyData({
  range,
  apmEsClient,
}: {
  range: Timerange;
  apmEsClient: ApmSynthtraceEsClient;
}): ScenarioReturnType<ApmFields> {
  const frontend = apm
    .service(FRONTEND_SERVICE.serviceName, 'production', 'nodejs')
    .instance('frontend-01');
  const checkoutService = apm
    .service(CHECKOUT_SERVICE.serviceName, 'production', 'java')
    .instance('checkout-01');
  const recommendationService = apm
    .service(RECOMMENDATION_SERVICE.serviceName, 'production', 'python')
    .instance('recommendation-01');

  const data = range
    .interval('1m')
    .rate(1)
    .generator((timestamp) => {
      // frontend → checkout-service → dependencies
      const frontendToCheckout = frontend
        .transaction('GET /checkout', 'request')
        .timestamp(timestamp)
        .duration(300)
        .success()
        .children(
          frontend
            .span('POST /api/checkout', EXTERNAL_HTTP_SPAN.spanType, EXTERNAL_HTTP_SPAN.spanSubtype)
            .destination(CHECKOUT_SERVICE.resource)
            .timestamp(timestamp + 10)
            .duration(180)
            .success()
            .children(
              checkoutService
                .transaction('POST /api/checkout', 'request')
                .timestamp(timestamp + 15)
                .duration(150)
                .success()
                .children(
                  checkoutService
                    .span(
                      'SELECT FROM orders',
                      POSTGRES_DEPENDENCY.spanType,
                      POSTGRES_DEPENDENCY.spanSubtype
                    )
                    .destination(POSTGRES_DEPENDENCY.resource)
                    .timestamp(timestamp + 20)
                    .duration(30)
                    .success(),
                  checkoutService
                    .span('GET cart:*', REDIS_DEPENDENCY.spanType, REDIS_DEPENDENCY.spanSubtype)
                    .destination(REDIS_DEPENDENCY.resource)
                    .timestamp(timestamp + 60)
                    .duration(5)
                    .success(),
                  checkoutService
                    .span('order.created', KAFKA_DEPENDENCY.spanType, KAFKA_DEPENDENCY.spanSubtype)
                    .destination(KAFKA_DEPENDENCY.resource)
                    .timestamp(timestamp + 80)
                    .duration(10)
                    .success()
                )
            )
        );

      // frontend → recommendation-service → postgres (separate trace for sibling exclusion testing)
      const frontendToRecommendation = frontend
        .transaction('GET /recommendations', 'request')
        .timestamp(timestamp + 400)
        .duration(150)
        .success()
        .children(
          frontend
            .span(
              'GET /api/recommendations',
              EXTERNAL_HTTP_SPAN.spanType,
              EXTERNAL_HTTP_SPAN.spanSubtype
            )
            .destination(RECOMMENDATION_SERVICE.resource)
            .timestamp(timestamp + 410)
            .duration(90)
            .success()
            .children(
              recommendationService
                .transaction('GET /api/recommendations', 'request')
                .timestamp(timestamp + 415)
                .duration(80)
                .success()
                .children(
                  recommendationService
                    .span(
                      'SELECT FROM products',
                      POSTGRES_DEPENDENCY.spanType,
                      POSTGRES_DEPENDENCY.spanSubtype
                    )
                    .destination(POSTGRES_DEPENDENCY.resource)
                    .timestamp(timestamp + 420)
                    .duration(40)
                    .success()
                )
            )
        );

      return [frontendToCheckout, frontendToRecommendation];
    });

  return withClient(apmEsClient, data);
}

export default createCliScenario(({ range, clients: { apmEsClient } }) => {
  return generateTopologyData({ range, apmEsClient });
});
