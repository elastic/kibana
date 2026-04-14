/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * SCENARIO: Service Topology — Cycle Detection
 *
 * Tests that BFS traversal terminates correctly when the service graph
 * contains a cycle (A→B→A callback pattern).
 *
 * Topology:
 *   cycle-service-a → cycle-service-b → cycle-service-a (callback)
 *
 * This verifies the visitedServices guard prevents infinite traversal.
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
 *     "serviceName": "cycle-service-a"
 *   }
 * }
 * ```
 */

import type { ApmFields, Timerange } from '@kbn/synthtrace-client';
import { apm } from '@kbn/synthtrace-client';
import { createCliScenario } from '../../../../lib/utils/create_scenario';
import { withClient, type ScenarioReturnType } from '../../../../lib/utils/with_client';
import type { ApmSynthtraceEsClient } from '../../../../lib/apm/client/apm_synthtrace_es_client';

export const CYCLE_SERVICE_A = {
  serviceName: 'cycle-service-a',
} as const;

export const CYCLE_SERVICE_B = {
  serviceName: 'cycle-service-b',
  resource: 'cycle-b-lb:8080',
} as const;

export function generateCycleTopologyData({
  range,
  apmEsClient,
}: {
  range: Timerange;
  apmEsClient: ApmSynthtraceEsClient;
}): ScenarioReturnType<ApmFields> {
  const serviceA = apm
    .service(CYCLE_SERVICE_A.serviceName, 'production', 'nodejs')
    .instance('a-01');
  const serviceB = apm.service(CYCLE_SERVICE_B.serviceName, 'production', 'java').instance('b-01');

  const data = range
    .interval('1m')
    .rate(1)
    .generator((timestamp) => {
      // Trace: A → B → A (callback pattern creating a cycle in the service graph)
      const trace = serviceA
        .transaction('GET /start', 'request')
        .timestamp(timestamp)
        .duration(500)
        .success()
        .children(
          serviceA
            .span('POST /api/b', 'external', 'http')
            .destination(CYCLE_SERVICE_B.resource)
            .timestamp(timestamp + 10)
            .duration(400)
            .success()
            .children(
              serviceB
                .transaction('POST /api/b', 'request')
                .timestamp(timestamp + 15)
                .duration(350)
                .success()
                .children(
                  serviceB
                    .span('GET /api/a/callback', 'external', 'http')
                    .destination('cycle-a-lb:8080')
                    .timestamp(timestamp + 20)
                    .duration(200)
                    .success()
                    .children(
                      serviceA
                        .transaction('GET /api/a/callback', 'request')
                        .timestamp(timestamp + 25)
                        .duration(100)
                        .success()
                    )
                )
            )
        );

      return [trace];
    });

  return withClient(apmEsClient, data);
}

export default createCliScenario(({ range, clients: { apmEsClient } }) => {
  return generateCycleTopologyData({ range, apmEsClient });
});
