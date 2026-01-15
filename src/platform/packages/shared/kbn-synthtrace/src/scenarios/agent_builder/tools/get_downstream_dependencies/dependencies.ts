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

import type { ApmFields, Timerange } from '@kbn/synthtrace-client';
import { apm } from '@kbn/synthtrace-client';
import { createCliScenario } from '../../../../lib/utils/create_scenario';
import { withClient, type ScenarioReturnType } from '../../../../lib/utils/with_client';
import type { ApmSynthtraceEsClient } from '../../../../lib/apm/client/apm_synthtrace_es_client';

interface DependencyConfig {
  spanName: string;
  spanType: string;
  spanSubtype: string;
  destination: string;
  duration: number;
}

export function generateDependenciesData({
  range,
  apmEsClient,
  serviceName,
  environment,
  agentName,
  transactionName,
  dependencies,
}: {
  range: Timerange;
  apmEsClient: ApmSynthtraceEsClient;
  serviceName: string;
  environment: string;
  agentName: string;
  transactionName: string;
  dependencies: DependencyConfig[];
}): ScenarioReturnType<ApmFields> {
  const service = apm.service(serviceName, environment, agentName).instance(`${serviceName}-01`);

  const data = range
    .interval('1m')
    .rate(1)
    .generator((timestamp) => {
      let offset = 10;
      const spans = dependencies.map((dep) => {
        const span = service
          .span(dep.spanName, dep.spanType, dep.spanSubtype)
          .destination(dep.destination)
          .timestamp(timestamp + offset)
          .duration(dep.duration)
          .success();
        offset += dep.duration + 10;
        return span;
      });

      return [
        service
          .transaction(transactionName, 'request')
          .timestamp(timestamp)
          .duration(200)
          .success()
          .children(...spans),
      ];
    });

  return withClient(apmEsClient, data);
}

export default createCliScenario(({ range, clients: { apmEsClient } }) => {
  const dependencies = [
    {
      spanName: 'POST https://payment.gateway/charge',
      spanType: 'external',
      spanSubtype: 'http',
      destination: 'payment-gateway',
      duration: 100,
    },
    {
      spanName: 'SELECT FROM orders',
      spanType: 'db',
      spanSubtype: 'postgresql',
      destination: 'postgres',
      duration: 20,
    },
    {
      spanName: 'orders',
      spanType: 'messaging',
      spanSubtype: 'kafka',
      destination: 'kafka',
      duration: 10,
    },
  ];

  return generateDependenciesData({
    range,
    apmEsClient,
    serviceName: 'checkout-service',
    environment: 'production',
    agentName: 'nodejs',
    transactionName: 'POST /api/checkout',
    dependencies,
  });
});
