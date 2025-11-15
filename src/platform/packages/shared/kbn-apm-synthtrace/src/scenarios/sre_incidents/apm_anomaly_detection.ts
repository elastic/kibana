/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * SCENARIO: APM anomaly detection
 *
 * Story: the production checkout service recently shipped a regression that caused
 * throughput and latency anomalies. The scenario generates a
 * clear spike and creates the APM anomaly detection job (`POST /internal/apm/settings/anomaly-detection/jobs`).
 *
 * Validate via:
 *
 * ```
 * POST kbn:///api/agent_builder/tools/_execute
 * {
 *   "tool_id": "observability.get_anomaly_detection_jobs",
 *   "tool_params": {}
 * }
 * ```
 */

import type { ApmFields } from '@kbn/apm-synthtrace-client';
import { apm } from '@kbn/apm-synthtrace-client';
import { duration } from 'moment';
import type { Scenario } from '../../cli/scenario';
import { withClient } from '../../lib/utils/with_client';
import { internalKibanaHeaders } from '../../lib/shared/client_headers';

const SCENARIO_ENVIRONMENT = 'production';

const scenario: Scenario<ApmFields> = async (runOptions) => {
  const { logger } = runOptions;

  return {
    teardown: async (_, kibanaClient) => {
      logger.info('APM anomaly detection job creation requested');

      await kibanaClient.fetch('/internal/apm/settings/anomaly-detection/jobs', {
        method: 'POST',
        headers: { ...internalKibanaHeaders() },
        body: JSON.stringify({ environments: [SCENARIO_ENVIRONMENT] }),
      });

      logger.info('APM anomaly detection job creation completed');
    },
    generate: ({ range, clients: { apmEsClient } }) => {
      // require range to be at least 4 hours to fit the spike
      if (range.to.valueOf() - range.from.valueOf() < duration(3, 'hours').asMilliseconds()) {
        throw new Error('Timerange for APM anomaly detection scenario must be at least 4 hours');
      }

      const service = apm
        .service('checkout-api', SCENARIO_ENVIRONMENT, 'node')
        .instance('instance-01');
      const spikeStart = range.to.valueOf() - duration(2, 'hours').asMilliseconds();
      const spikeEnd = range.to.valueOf() - duration(1, 'hours').asMilliseconds();

      const data = range
        .interval('1m')
        .rate(1)
        .generator((timestamp) => {
          const isSpike = timestamp >= spikeStart && timestamp <= spikeEnd;
          const traceDuration = isSpike ? 8000 : 200;
          const outcome = isSpike && timestamp % 10 === 0 ? 'failure' : 'success';
          const docs = [
            service
              .transaction('POST /api/checkout', 'request')
              .timestamp(timestamp)
              .duration(traceDuration)
              .outcome(outcome),

            // create some overlapping transactions to simulate real world load
            service
              .transaction('GET /api/cart', 'request')
              .timestamp(timestamp + Math.random() * 100)
              .duration(traceDuration * Math.random())
              .outcome('success'),
          ];

          if (isSpike) {
            docs.push(
              service
                .transaction('POST /api/checkout', 'request')
                .timestamp(timestamp + 100)
                .duration(traceDuration * 1.2)
                .outcome('failure')
            );
          }

          return docs;
        });

      return withClient(apmEsClient, data);
    },
  };
};

export default scenario;
