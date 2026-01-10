/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * SCENARIO: Log Change Points (Spike Pattern)
 *
 * Creates log data with a SPIKE pattern for testing the get_log_change_points tool.
 * Generates baseline logs throughout the time window, with a significant spike
 * of error logs in a specific window to trigger change point detection.
 *
 * Timeline:
 * - Full window: now-60m to now
 * - Spike window: now-30m to now-25m (1000 error logs per minute vs 5 baseline)
 *
 * Validate via:
 *
 * ```
 * POST kbn:///api/agent_builder/tools/_execute
 * {
 *   "tool_id": "observability.get_log_change_points",
 *   "tool_params": {
 *     "start": "now-60m",
 *     "end": "now",
 *     "index": "logs-app.logs-default"
 *   }
 * }
 * ```
 */

import datemath from '@elastic/datemath';
import type { LogDocument, Timerange } from '@kbn/synthtrace-client';
import { log, timerange } from '@kbn/synthtrace-client';
import { createCliScenario } from '../../../../lib/utils/create_scenario';
import type { LogsSynthtraceEsClient } from '../../../../lib/logs/logs_synthtrace_es_client';
import { withClient, type ScenarioReturnType } from '../../../../lib/utils/with_client';

const DATASET = 'app.logs';
const SERVICE_NAME = 'test-service';

/**
 * Data stream name for log change points data
 */
export const LOG_CHANGE_POINTS_DATA_STREAM = `logs-${DATASET}-default`;

/**
 * Full analysis time window for log change points
 */
export const LOG_CHANGE_POINTS_ANALYSIS_WINDOW = {
  start: 'now-60m',
  end: 'now',
} as const;

/**
 * Spike window where error logs surge (subset of the analysis window)
 */
export const LOG_CHANGE_POINTS_SPIKE_WINDOW = {
  start: 'now-30m',
  end: 'now-25m',
} as const;

/**
 * Generates log data with a SPIKE pattern for change point detection.
 * Can be used both by CLI (via default export) and by API tests (via direct import).
 */
export function generateLogChangePointsData({
  logsEsClient,
  range,
}: {
  logsEsClient: LogsSynthtraceEsClient;
  range?: Timerange;
}): ScenarioReturnType<LogDocument> {
  const effectiveRange =
    range ??
    timerange(LOG_CHANGE_POINTS_ANALYSIS_WINDOW.start, LOG_CHANGE_POINTS_ANALYSIS_WINDOW.end);

  const spikeStart = datemath.parse(LOG_CHANGE_POINTS_SPIKE_WINDOW.start)!.valueOf();
  const spikeEnd = datemath.parse(LOG_CHANGE_POINTS_SPIKE_WINDOW.end)!.valueOf();

  const logStream = effectiveRange
    .interval('1m')
    .rate(1)
    .generator((timestamp) => {
      const isSpike = timestamp >= spikeStart && timestamp < spikeEnd;
      const logs = [];

      // Baseline normal logs (5 per minute)
      for (let i = 0; i < 5; i++) {
        logs.push(
          log
            .create()
            .dataset(DATASET)
            .service(SERVICE_NAME)
            .message('Normal operation completed successfully')
            .logLevel('info')
            .timestamp(timestamp)
        );
      }

      // Error logs: 1000 during spike, 5 otherwise
      const errorCount = isSpike ? 1000 : 5;
      for (let i = 0; i < errorCount; i++) {
        logs.push(
          log
            .create()
            .dataset(DATASET)
            .service(SERVICE_NAME)
            .message('Database connection error: timeout after 30000ms')
            .logLevel('error')
            .timestamp(timestamp)
        );
      }

      return logs;
    });

  return withClient(logsEsClient, logStream);
}

export default createCliScenario(({ range, clients: { logsEsClient } }) =>
  generateLogChangePointsData({ logsEsClient, range })
);
