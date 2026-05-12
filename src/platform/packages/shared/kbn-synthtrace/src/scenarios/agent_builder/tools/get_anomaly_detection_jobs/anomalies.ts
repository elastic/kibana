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

import type { ApmFields, Timerange } from '@kbn/synthtrace-client';
import { apm } from '@kbn/synthtrace-client';
import { duration } from 'moment';
import type { Client } from '@elastic/elasticsearch';
import type { Scenario } from '../../../../cli/scenario';
import type { KibanaClient } from '../../../../lib/shared/base_kibana_client';
import type { Logger } from '../../../../lib/utils/create_logger';
import type { ApmSynthtraceEsClient } from '../../../../lib/apm/client/apm_synthtrace_es_client';
import { withClient } from '../../../../lib/utils/with_client';
import type { ScenarioReturnType } from '../../../../lib/utils/with_client';
import { internalKibanaHeaders } from '../../../../lib/shared/client_headers';

export function generateApmDataWithAnomalies({
  apmEsClient,
  range,
  serviceName,
  environment,
  language,
}: {
  apmEsClient: ApmSynthtraceEsClient;
  range: Timerange;
  serviceName: string;
  environment: string;
  language: string;
}): ScenarioReturnType<ApmFields> {
  // require range to be at least 3 hours to fit the spike
  if (range.to.valueOf() - range.from.valueOf() < duration(3, 'hours').asMilliseconds()) {
    throw new Error('Timerange for APM anomaly detection scenario must be at least 3 hours');
  }

  const service = apm
    .service({ name: serviceName, environment, agentName: language })
    .instance('instance-01');

  const spikeStart = range.to.valueOf() - duration(2, 'hours').asMilliseconds();
  const spikeEnd = range.to.valueOf() - duration(1, 'hours').asMilliseconds();

  const data = range
    .interval('1m')
    .rate(10)
    .generator((timestamp) => {
      const isSpike = timestamp >= spikeStart && timestamp <= spikeEnd;
      const traceDuration = isSpike ? 8000 : 200;
      // Introduce failures during the spike
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
          .timestamp(timestamp + 50)
          .duration(traceDuration * 0.5)
          .outcome('success'),
      ];

      if (isSpike) {
        // Add extra traffic during spike with failures
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
}

export async function createApmAnomalyDetectionJob(
  kibanaClient: KibanaClient,
  environment: string
): Promise<void> {
  await kibanaClient.fetch('/internal/apm/settings/anomaly-detection/jobs', {
    method: 'POST',
    headers: { ...internalKibanaHeaders() },
    body: JSON.stringify({ environments: [environment] }),
  });
}

export async function cleanupApmAnomalyDetectionJobs(
  esClient: Client,
  logger: Logger
): Promise<void> {
  try {
    const { jobs } = await esClient.ml.getJobs({ job_id: 'apm-*' });
    if (jobs.length > 0) {
      logger.info(`Cleaning up ${jobs.length} existing APM anomaly detection jobs`);
      for (const job of jobs) {
        const jobId = job.job_id;

        await esClient.ml
          .stopDatafeed({ datafeed_id: `datafeed-${jobId}`, force: true })
          .catch(() => {});

        await esClient.ml.closeJob({ job_id: jobId, force: true }).catch(() => {});
        await esClient.ml.deleteJob({ job_id: jobId, force: true }).catch(() => {});
        logger.info(`Deleted ML job: ${jobId}`);
      }
    }
  } catch {
    // No jobs found or ML not available
  }
}

const scenario: Scenario<ApmFields> = async ({ logger }) => ({
  teardown: async (_, kibanaClient, esClient) => {
    // Clean up existing jobs before creating new ones
    await cleanupApmAnomalyDetectionJobs(esClient, logger);

    logger.info('APM anomaly detection job creation requested');
    await createApmAnomalyDetectionJob(kibanaClient, 'production');
    logger.info('APM anomaly detection job creation completed');
  },
  generate: ({ range, clients: { apmEsClient } }) =>
    generateApmDataWithAnomalies({
      apmEsClient,
      range,
      serviceName: 'checkout-api',
      environment: 'production',
      language: 'node',
    }),
});

export default scenario;
