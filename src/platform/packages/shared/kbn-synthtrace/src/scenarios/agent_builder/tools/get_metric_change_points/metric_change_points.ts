/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * SCENARIO: Metric change points
 *
 * Story: Generates metric data with an increase in document count and memory free values in a spike window,
 * producing a clear change point that the `get_metric_change_points` tool can detect.
 *
 * Baseline: low document count per minute and lower memory free values.
 * Spike window (`METRIC_CHANGE_POINTS_ANALYSIS_SPIKE_WINDOW`): higher document
 * count per minute and higher memory free values.
 *
 * Validate via:
 *
 * ```
 * POST kbn:///api/agent_builder/tools/_execute
 * {
 *   "tool_id": "observability.get_metric_change_points",
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

const SERVICE_NAME = 'test-service';
export const METRIC_CHANGE_POINTS_INDEX = `metrics-apm.app.${SERVICE_NAME}-default`;
export const METRIC_CHANGE_POINTS_ANALYSIS_WINDOW = {
  start: 'now-60m',
  end: 'now',
};
export const METRIC_CHANGE_POINTS_ANALYSIS_SPIKE_WINDOW = {
  start: 'now-30m',
  end: 'now-28m',
};

export function generateMetricChangePointsData({
  range,
  apmEsClient,
}: {
  range?: Timerange;
  apmEsClient: ApmSynthtraceEsClient;
}): ScenarioReturnType<ApmFields> {
  const effectiveRange =
    range ??
    timerange(METRIC_CHANGE_POINTS_ANALYSIS_WINDOW.start, METRIC_CHANGE_POINTS_ANALYSIS_WINDOW.end);
  const spikeStart = datemath.parse(METRIC_CHANGE_POINTS_ANALYSIS_SPIKE_WINDOW.start)!.valueOf();
  const spikeEnd = datemath.parse(METRIC_CHANGE_POINTS_ANALYSIS_SPIKE_WINDOW.end)!.valueOf();

  const instance = apm
    .service({
      name: SERVICE_NAME,
      environment: 'test',
      agentName: 'test-agent',
    })
    .instance('instance-test');

  const metricStream = effectiveRange
    .interval('1m')
    .rate(1)
    .generator((timestamp) => {
      const isSpike = timestamp >= spikeStart && timestamp < spikeEnd;
      const docCount = isSpike ? 500 : 5;
      const memoryFree = isSpike ? 10000 : 1000;

      const metrics = [];
      for (let i = 0; i < docCount; i++) {
        metrics.push(
          instance
            .appMetrics({
              'system.memory.actual.free': memoryFree,
              'system.memory.total': 10000,
            })
            .timestamp(timestamp)
        );
      }
      return metrics;
    });

  return withClient(apmEsClient, metricStream);
}

export default createCliScenario(({ range, clients: { apmEsClient } }) =>
  generateMetricChangePointsData({
    range,
    apmEsClient,
  })
);
