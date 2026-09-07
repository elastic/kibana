/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * SCENARIO: Log rate analysis spike
 *
 * Emits baseline payment logs with a `PAYMENT_RESPONSE tenant=<id> outcome=OK`
 * message. In the last 20 minutes of the range, a new error pattern
 * `PAYMENT_TIMEOUT tenant=<id> provider=<provider> status=504` appears. When
 * log rate analysis succeeds, the spike should be attributed to the message
 * text. Use:
 *
 * ```
 * POST kbn:///api/agent_builder/tools/_execute
 * {
 *   "tool_id": "observability.run_log_rate_analysis",
 *   "tool_params": {
 *     "index": "logs-*",
 *     "baseline": { "start": "now-60m", "end": "now-20m" },
 *     "deviation": { "start": "now-20m", "end": "now" }
 *   }
 * }
 * ```
 */

import datemath from '@elastic/datemath';
import type { LogDocument, Timerange } from '@kbn/synthtrace-client';
import { generateShortId, log, timerange } from '@kbn/synthtrace-client';
import { createCliScenario } from '../../../../lib/utils/create_scenario';
import type { LogsSynthtraceEsClient } from '../../../../lib/logs/logs_synthtrace_es_client';
import { withClient } from '../../../../lib/utils/with_client';
import type { ScenarioReturnType } from '../../../../lib/utils/with_client';

const DATASET = 'payments.api';
const SERVICE_NAME = 'payments-service';
const BASE_DOCS_PER_STEP = 10;
const SPIKE_DOCS_PER_STEP = 110;

/**
 * Baseline time window for log rate analysis (before the spike)
 */
export const LOG_RATE_ANALYSIS_SPIKE_BASELINE_WINDOW = {
  start: 'now-60m',
  end: 'now-20m',
} as const;

/**
 * Deviation time window for log rate analysis (during the spike)
 */
export const LOG_RATE_ANALYSIS_SPIKE_DEVIATION_WINDOW = {
  start: 'now-20m',
  end: 'now',
} as const;

/**
 * Data stream name for log rate analysis spike data
 */
export const LOG_RATE_ANALYSIS_SPIKE_DATA_STREAM = `logs-${DATASET}-default`;

/**
 * Generates a spike-pattern log dataset for log rate analysis.
 * Emits steady baseline logs and introduces a flood of timeout errors
 * in the last 20 minutes of the range so the tool can attribute the spike.
 *
 */
export function generateLogRateAnalysisSpikeData({
  logsEsClient,
  range,
  isLogsDb = false,
}: {
  logsEsClient: LogsSynthtraceEsClient;
  range?: Timerange;
  isLogsDb?: boolean;
}): ScenarioReturnType<LogDocument> {
  const effectiveRange =
    range ??
    timerange(
      LOG_RATE_ANALYSIS_SPIKE_BASELINE_WINDOW.start,
      LOG_RATE_ANALYSIS_SPIKE_DEVIATION_WINDOW.end
    );

  const spikeStart = datemath.parse(LOG_RATE_ANALYSIS_SPIKE_DEVIATION_WINDOW.start)!.valueOf();
  const spikeEnd = datemath.parse(LOG_RATE_ANALYSIS_SPIKE_DEVIATION_WINDOW.end)!.valueOf();

  const logStream = effectiveRange
    .interval('30s')
    .rate(1)
    .generator((timestamp, index) => {
      const tenantId = index % 2 === 0 ? 'acme-bank' : 'omega-shop';
      const provider = index % 2 === 0 ? 'adyen-edge' : 'worldpay-plus';
      const region = index % 10 === 0 ? 'us-east-1' : 'us-west-2';
      const baseMessage = `PAYMENT_RESPONSE tenant=${tenantId} outcome=OK`;
      const spikeMessage = `PAYMENT_TIMEOUT tenant=${tenantId} provider=${provider} status=504 reason=gateway_timeout`;

      const baseDocs = Array.from({ length: BASE_DOCS_PER_STEP }, () =>
        log
          .create({ isLogsDb })
          .dataset(DATASET)
          .service(SERVICE_NAME)
          .message(baseMessage)
          .logLevel('info')
          .defaults({
            'service.environment': 'production',
            'event.dataset': DATASET,
            'event.category': 'application',
            'http.request.method': 'POST',
            'cloud.region': region,
            'client.ip': '10.8.0.10',
            'error.message': baseMessage,
            'trace.id': generateShortId(),
            'http.response.status_code': 200,
          })
          .timestamp(timestamp)
      );

      const isSpike = timestamp >= spikeStart && timestamp <= spikeEnd;

      const spikeDocs = isSpike
        ? Array.from({ length: SPIKE_DOCS_PER_STEP }, () =>
            log
              .create({ isLogsDb })
              .dataset(DATASET)
              .service(SERVICE_NAME)
              .message(spikeMessage)
              .logLevel('error')
              .defaults({
                'service.environment': 'production',
                'event.dataset': DATASET,
                'event.category': 'application',
                'http.request.method': 'POST',
                'cloud.region': region,
                'client.ip': '10.8.0.10',
                'error.message': spikeMessage,
                'trace.id': generateShortId(),
                'http.response.status_code': 500,
              })
              .timestamp(timestamp)
          )
        : [];

      return [...baseDocs, ...spikeDocs];
    });

  return withClient(logsEsClient, logStream);
}

export default createCliScenario(({ range, clients: { logsEsClient } }) =>
  generateLogRateAnalysisSpikeData({ logsEsClient, range, isLogsDb: false })
);
