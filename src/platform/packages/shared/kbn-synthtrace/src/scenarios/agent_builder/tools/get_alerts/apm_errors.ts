/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * SCENARIO: APM transactions with errors
 *
 * Story: Generates APM transactions with failures and errors. Used in API tests
 * to trigger alert rules (e.g., transaction error rate alerts).
 *
 * NOTE: This scenario generates APM error data, not alerts directly. To see
 * alerts, you must first create an alert rule that triggers on this data.
 * For synthetic alerts without rules, use the `alerts.ts` scenario instead.
 *
 * Validate via:
 *
 * ```
 * POST kbn:///api/agent_builder/tools/_execute
 * {
 *   "tool_id": "observability.get_services",
 *   "tool_params": { "start": "now-15m", "end": "now" }
 * }
 * ```
 */

import { apm } from '@kbn/synthtrace-client';
import type { ApmFields, Timerange } from '@kbn/synthtrace-client';
import type { ApmSynthtraceEsClient } from '../../../../lib/apm/client/apm_synthtrace_es_client';
import { createCliScenario } from '../../../../lib/utils/create_scenario';
import { withClient } from '../../../../lib/utils/with_client';
import type { ScenarioReturnType } from '../../../../lib/utils/with_client';

export function generateApmErrorData({
  range,
  apmEsClient,
  serviceName,
  environment,
  language,
}: {
  range: Timerange;
  apmEsClient: ApmSynthtraceEsClient;
  serviceName: string | string[];
  environment: string;
  language: string;
}): ScenarioReturnType<ApmFields>[] {
  const serviceNames = Array.isArray(serviceName) ? serviceName : [serviceName];

  return serviceNames.map((name) => {
    const instance = apm
      .service({ name, environment, agentName: language })
      .instance(`${name}-instance`);

    const data = range
      .interval('1m')
      .rate(10)
      .generator((timestamp) => [
        instance
          .transaction('GET /api')
          .timestamp(timestamp)
          .duration(50)
          .failure()
          .errors(
            instance.error({ message: 'error message', type: 'Sample Type' }).timestamp(timestamp)
          ),
      ]);

    return withClient(apmEsClient, data);
  });
}

export default createCliScenario(({ range, clients: { apmEsClient } }) =>
  generateApmErrorData({
    range,
    apmEsClient,
    serviceName: 'my-service',
    environment: 'production',
    language: 'go',
  })
);
