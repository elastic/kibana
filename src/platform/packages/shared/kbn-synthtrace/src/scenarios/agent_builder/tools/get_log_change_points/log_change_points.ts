/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * SCENARIO: Log change points (spike)
 *
 * Story: Emits baseline logs with a message "Normal operation completed successfully".
 * In a spike window, new error pattern with message "Database connection error: timeout after 30000ms" appears.
 * This produces a clear change point in the error log volume so the
 * `get_log_change_points` tool can detect the change.
 *
 * Baseline:
 * - 5 info logs/minute
 * - 5 error logs/minute
 *
 * Spike window (`LOG_CHANGE_POINTS_ANALYSIS_SPIKE_WINDOW`):
 * - 5 info logs/minute
 * - 1000 error logs/minute
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
 *   }
 * }
 * ```
 */

import datemath from '@elastic/datemath';
import type { LogDocument, Timerange } from '@kbn/synthtrace-client';
import { log, timerange } from '@kbn/synthtrace-client';
import { createCliScenario } from '../../../../lib/utils/create_scenario';
import type { LogsSynthtraceEsClient } from '../../../../lib/logs/logs_synthtrace_es_client';
import { withClient } from '../../../../lib/utils/with_client';
import type { ScenarioReturnType } from '../../../../lib/utils/with_client';

const DATASET = 'app.logs';
const SERVICE_NAME = 'test-service';
export const LOG_CHANGE_POINTS_DATA_STREAM = `logs-${DATASET}-default`;
export const LOG_CHANGE_POINTS_ANALYSIS_WINDOW = {
  start: 'now-60m',
  end: 'now',
};
export const LOG_CHANGE_POINTS_ANALYSIS_SPIKE_WINDOW = {
  start: 'now-30m',
  end: 'now-25m',
};

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

  const spikeStart = datemath.parse(LOG_CHANGE_POINTS_ANALYSIS_SPIKE_WINDOW.start)!.valueOf();
  const spikeEnd = datemath.parse(LOG_CHANGE_POINTS_ANALYSIS_SPIKE_WINDOW.end)!.valueOf();

  const logStream = effectiveRange
    .interval('1m')
    .rate(1)
    .generator((timestamp) => {
      const isSpike = timestamp >= spikeStart && timestamp < spikeEnd;
      const logs = [];

      // Baseline normal logs
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
  generateLogChangePointsData({
    range,
    logsEsClient,
  })
);
