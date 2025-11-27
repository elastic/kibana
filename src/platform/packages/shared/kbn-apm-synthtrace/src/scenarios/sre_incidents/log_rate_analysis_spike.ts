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
 *     "baseline": { "from": "now-60m", "to": "now-20m" },
 *     "deviation": { "from": "now-20m", "to": "now" }
 *   }
 * }
 * ```
 */

import type { LogDocument } from '@kbn/apm-synthtrace-client';
import { generateShortId, log } from '@kbn/apm-synthtrace-client';
import type { Scenario } from '../../cli/scenario';
import { getSynthtraceEnvironment } from '../../lib/utils/get_synthtrace_environment';
import { withClient } from '../../lib/utils/with_client';
import { parseLogsScenarioOpts } from '../helpers/logs_scenario_opts_parser';

const ENVIRONMENT = getSynthtraceEnvironment(__filename);
const SPIKE_WINDOW_MS = 20 * 60 * 1000;

const scenario: Scenario<LogDocument> = async (runOptions) => {
  const { isLogsDb } = parseLogsScenarioOpts(runOptions.scenarioOpts);

  return {
    generate: ({ range, clients: { logsEsClient } }) => {
      const { logger } = runOptions;
      const spikeStart = range.to.getTime() - SPIKE_WINDOW_MS;
      const timestamps = range.interval('30s');

      const baseDocsPerStep = 10;
      const spikeDocsPerStep = 110;
      const logs = timestamps.rate(1).generator((timestamp, index) => {
        const tenantId = index % 2 === 0 ? 'acme-bank' : 'omega-shop';
        const provider = index % 2 === 0 ? 'adyen-edge' : 'worldpay-plus';
        const baseMessage = `PAYMENT_RESPONSE tenant=${tenantId} outcome=OK`;
        const spikeMessage = `PAYMENT_TIMEOUT tenant=${tenantId} provider=${provider} status=504 reason=gateway_timeout`;

        const baseDocs = Array(baseDocsPerStep)
          .fill(0)
          .map(() =>
            log
              .create({ isLogsDb })
              .dataset('payments.api')
              .service('payments-service')
              .message(baseMessage)
              .logLevel('error')
              .defaults({
                'service.environment': ENVIRONMENT,
                'event.dataset': 'payments.api',
                'event.category': 'application',
                'http.request.method': 'POST',
                'cloud.region': 'us-east-1',
                'client.ip': '10.8.0.10',
                'error.message': baseMessage,
                'trace.id': generateShortId(),
              })
              .timestamp(timestamp)
          );

        const spikeDocs =
          timestamp >= spikeStart
            ? Array(spikeDocsPerStep)
                .fill(0)
                .map(() =>
                  log
                    .create({ isLogsDb })
                    .dataset('payments.api')
                    .service('payments-service')
                    .message(spikeMessage)
                    .logLevel('error')
                    .defaults({
                      'service.environment': ENVIRONMENT,
                      'event.dataset': 'payments.api',
                      'event.category': 'application',
                      'http.request.method': 'POST',
                      'cloud.region': 'us-east-1',
                      'client.ip': '10.8.0.10',
                      'error.message': spikeMessage,
                      'trace.id': generateShortId(),
                    })
                    .timestamp(timestamp)
                )
            : [];

        return [...baseDocs, ...spikeDocs];
      });

      return withClient(
        logsEsClient,
        logger.perf('generating_log_rate_analysis_spike_logs', () => logs)
      );
    },
  };
};

export default scenario;
