/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * SCENARIO: Metric Change Points (Spike Pattern)
 *
 * Creates metric data with a SPIKE pattern for testing the get_metric_change_points tool.
 * Generates baseline APM app metrics throughout the time window, with a significant spike
 * in both document count and metric values in a specific window.
 *
 * Timeline:
 * - Full window: now-60m to now
 * - Spike window: now-30m to now-28m (500 docs with 10x memory values vs 5 baseline)
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
 *     "index": "metrics-apm.app.test-service-default"
 *   }
 * }
 * ```
 */

import datemath from '@elastic/datemath';
import type { ApmFields, Timerange } from '@kbn/synthtrace-client';
import { apm, timerange } from '@kbn/synthtrace-client';
import { createCliScenario } from '../../../../lib/utils/create_scenario';
import type { ApmSynthtraceEsClient } from '../../../../lib/apm/client/apm_synthtrace_es_client';
import { withClient, type ScenarioReturnType } from '../../../../lib/utils/with_client';

const SERVICE_NAME = 'test-service';

/**
 * Index pattern for metric change points data
 */
export const METRIC_CHANGE_POINTS_INDEX = `metrics-apm.app.${SERVICE_NAME}-default`;

/**
 * Full analysis time window for metric change points
 */
export const METRIC_CHANGE_POINTS_ANALYSIS_WINDOW = {
  start: 'now-60m',
  end: 'now',
} as const;

/**
 * Spike window where metrics surge (subset of the analysis window)
 */
export const METRIC_CHANGE_POINTS_SPIKE_WINDOW = {
  start: 'now-30m',
  end: 'now-28m',
} as const;

/**
 * Generates metric data with a SPIKE pattern for change point detection.
 * Can be used both by CLI (via default export) and by API tests (via direct import).
 */
export function generateMetricChangePointsData({
  apmEsClient,
  range,
}: {
  apmEsClient: ApmSynthtraceEsClient;
  range?: Timerange;
}): ScenarioReturnType<ApmFields> {
  const effectiveRange =
    range ??
    timerange(METRIC_CHANGE_POINTS_ANALYSIS_WINDOW.start, METRIC_CHANGE_POINTS_ANALYSIS_WINDOW.end);

  const spikeStart = datemath.parse(METRIC_CHANGE_POINTS_SPIKE_WINDOW.start)!.valueOf();
  const spikeEnd = datemath.parse(METRIC_CHANGE_POINTS_SPIKE_WINDOW.end)!.valueOf();

  const instance = apm
    .service({ name: SERVICE_NAME, environment: 'test', agentName: 'test-agent' })
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
  generateMetricChangePointsData({ apmEsClient, range })
);
