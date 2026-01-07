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

import type { ApmFields, Timerange } from '@kbn/synthtrace-client';
import { apm } from '@kbn/synthtrace-client';
import { createCliScenario } from '../../../../lib/utils/create_scenario';
import { withClient, type ScenarioReturnType } from '../../../../lib/utils/with_client';
import type { ApmSynthtraceEsClient } from '../../../../lib/apm/client/apm_synthtrace_es_client';

/**
 * Configuration for a service to generate
 */
export interface ServiceConfig {
  name: string;
  environment: string;
  agentName: string;
  transactionName: string;
  transactionType: string;
  duration: number;
  errorRate?: number; // 0-1, probability of failure
}

/**
 * Generates APM service data.
 * Can be used both by CLI (via default export) and by API tests (via direct import).
 */
export function generateServicesData({
  range,
  apmEsClient,
  services,
}: {
  range: Timerange;
  apmEsClient: ApmSynthtraceEsClient;
  services: ServiceConfig[];
}): ScenarioReturnType<ApmFields> {
  const data = range
    .interval('1m')
    .rate(1)
    .generator((timestamp) => {
      return services.flatMap((serviceConfig) => {
        const instance = apm
          .service(serviceConfig.name, serviceConfig.environment, serviceConfig.agentName)
          .instance(`${serviceConfig.name}-01`);

        const isError = Math.random() < (serviceConfig.errorRate ?? 0);
        const duration = isError ? serviceConfig.duration * 2.5 : serviceConfig.duration;

        return instance
          .transaction(serviceConfig.transactionName, serviceConfig.transactionType)
          .timestamp(timestamp)
          .duration(duration)
          .outcome(isError ? 'failure' : 'success');
      });
    });

  return withClient(apmEsClient, data);
}

export default createCliScenario(({ range, clients: { apmEsClient } }) => {
  const services: ServiceConfig[] = [
    {
      name: 'checkout-service',
      environment: 'production',
      agentName: 'nodejs',
      transactionName: 'POST /api/checkout',
      transactionType: 'request',
      duration: 150,
      errorRate: 0,
    },
    {
      name: 'payment-service',
      environment: 'production',
      agentName: 'java',
      transactionName: 'POST /api/pay',
      transactionType: 'request',
      duration: 200,
      errorRate: 0.5, // 50% error rate
    },
    {
      name: 'frontend',
      environment: 'staging',
      agentName: 'rum-js',
      transactionName: 'PAGE_LOAD /home',
      transactionType: 'page-load',
      duration: 500,
      errorRate: 0,
    },
    {
      name: 'experimental-service',
      environment: 'development',
      agentName: 'ruby',
      transactionName: 'GET /test',
      transactionType: 'request',
      duration: 200,
      errorRate: 0,
    },
  ];

  return generateServicesData({ range, apmEsClient, services });
});
