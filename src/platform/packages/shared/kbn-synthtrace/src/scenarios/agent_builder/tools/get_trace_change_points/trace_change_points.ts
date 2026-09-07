/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * SCENARIO: Trace change points
 *
 * Story: Generates APM transaction data with increase in durations in a spike window.
 * This produces a clear change point in the trace duration distribution so the
 * `get_trace_change_points` tool should detect the change.
 *
 * Baseline: shorter transaction and span durations.
 * Spike window (`TRACE_CHANGE_POINTS_ANALYSIS_SPIKE_WINDOW`): longer transaction and span durations.
 *
 * Validate via:
 *
 * ```
 * POST kbn:///api/agent_builder/tools/_execute
 * {
 *   "tool_id": "observability.get_trace_change_points",
 *   "tool_params": {
 *     "start": "now-60m",
 *     "end": "now",
 *   }
 * }
 * ```
 */

import datemath from '@elastic/datemath';
import { apm, timerange } from '@kbn/synthtrace-client';
import type { ApmFields, Timerange } from '@kbn/synthtrace-client';
import type { ApmSynthtraceEsClient } from '../../../../lib/apm/client/apm_synthtrace_es_client';
import { createCliScenario } from '../../../../lib/utils/create_scenario';
import { withClient } from '../../../../lib/utils/with_client';
import type { ScenarioReturnType } from '../../../../lib/utils/with_client';

export const TRACE_CHANGE_POINTS_SERVICE_NAME = 'test-service';
export const TRACE_CHANGE_POINTS_ANALYSIS_WINDOW = {
  start: 'now-60m',
  end: 'now',
};
export const TRACE_CHANGE_POINTS_ANALYSIS_SPIKE_WINDOW = {
  start: 'now-30m',
  end: 'now-28m',
};

export function generateTraceChangePointsData({
  range,
  apmEsClient,
}: {
  range?: Timerange;
  apmEsClient: ApmSynthtraceEsClient;
}): ScenarioReturnType<ApmFields> {
  const effectiveRange =
    range ??
    timerange(TRACE_CHANGE_POINTS_ANALYSIS_WINDOW.start, TRACE_CHANGE_POINTS_ANALYSIS_WINDOW.end);

  const spikeStart = datemath.parse(TRACE_CHANGE_POINTS_ANALYSIS_SPIKE_WINDOW.start)!.valueOf();
  const spikeEnd = datemath.parse(TRACE_CHANGE_POINTS_ANALYSIS_SPIKE_WINDOW.end)!.valueOf();

  const instance = apm
    .service({
      name: TRACE_CHANGE_POINTS_SERVICE_NAME,
      environment: 'test',
      agentName: 'test-agent',
    })
    .instance('instance-test');

  const transactionName = 'GET /api/orders';

  const traceStream = effectiveRange
    .interval('1m')
    .rate(1)
    .generator((timestamp) => {
      const isSpike = timestamp >= spikeStart && timestamp < spikeEnd;

      const txDurationUs = isSpike ? 5_000 : 500;
      const spanDurationUs = isSpike ? 10_000 : 1_000;

      const traces = [];
      for (let i = 0; i < 25; i++) {
        traces.push(
          instance
            .transaction({ transactionName })
            .timestamp(timestamp)
            .duration(txDurationUs)
            .children(
              instance
                .span({ spanName: 'db.query', spanType: 'db' })
                .timestamp(timestamp)
                .duration(spanDurationUs)
                .success()
            )
            .success()
        );
      }
      return traces;
    });

  return withClient(apmEsClient, traceStream);
}

export default createCliScenario(({ range, clients: { apmEsClient } }) =>
  generateTraceChangePointsData({
    range,
    apmEsClient,
  })
);
