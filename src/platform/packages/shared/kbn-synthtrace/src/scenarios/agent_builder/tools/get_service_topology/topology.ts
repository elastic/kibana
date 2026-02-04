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
 * Story: Generates a multi-hop service topology with various dependency types.
 *
 * Topology:
 *   frontend (nodejs)
 *     → checkout-service (java)
 *         → postgres (db)
 *         → redis (cache)
 *         → kafka (messaging)
 *     → recommendation-service (python)
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

export function generateTopologyData({
  range,
  apmEsClient,
}: {
  range: Timerange;
  apmEsClient: ApmSynthtraceEsClient;
}): ScenarioReturnType<ApmFields> {
  const frontend = apm.service('frontend', 'production', 'nodejs').instance('frontend-01');
  const checkoutService = apm
    .service('checkout-service', 'production', 'java')
    .instance('checkout-01');
  const recommendationService = apm
    .service('recommendation-service', 'production', 'python')
    .instance('recommendation-01');

  const data = range
    .interval('1m')
    .rate(1)
    .generator((timestamp) => {
      // checkout-service: handles checkout and calls postgres, redis, kafka
      const checkoutTransaction = checkoutService
        .transaction('POST /api/checkout', 'request')
        .timestamp(timestamp + 50)
        .duration(150)
        .success()
        .children(
          checkoutService
            .span('SELECT FROM orders', 'db', 'postgresql')
            .destination('postgres')
            .timestamp(timestamp + 60)
            .duration(30)
            .success(),
          checkoutService
            .span('GET cart:*', 'db', 'redis')
            .destination('redis')
            .timestamp(timestamp + 100)
            .duration(5)
            .success(),
          checkoutService
            .span('order.created', 'messaging', 'kafka')
            .destination('kafka')
            .timestamp(timestamp + 120)
            .duration(10)
            .success()
        );

      // recommendation-service: handles recommendations and calls postgres
      const recommendationTransaction = recommendationService
        .transaction('GET /api/recommendations', 'request')
        .timestamp(timestamp + 50)
        .duration(80)
        .success()
        .children(
          recommendationService
            .span('SELECT FROM products', 'db', 'postgresql')
            .destination('postgres')
            .timestamp(timestamp + 60)
            .duration(40)
            .success()
        );

      // frontend: calls checkout-service and recommendation-service
      const frontendTransaction = frontend
        .transaction('GET /checkout', 'request')
        .timestamp(timestamp)
        .duration(300)
        .success()
        .children(
          frontend
            .span('POST /api/checkout', 'external', 'http')
            .destination('checkout-service')
            .timestamp(timestamp + 10)
            .duration(180)
            .success(),
          frontend
            .span('GET /api/recommendations', 'external', 'http')
            .destination('recommendation-service')
            .timestamp(timestamp + 200)
            .duration(90)
            .success()
        );

      return [frontendTransaction, checkoutTransaction, recommendationTransaction];
    });

  return withClient(apmEsClient, data);
}

export default createCliScenario(({ range, clients: { apmEsClient } }) => {
  return generateTopologyData({ range, apmEsClient });
});
