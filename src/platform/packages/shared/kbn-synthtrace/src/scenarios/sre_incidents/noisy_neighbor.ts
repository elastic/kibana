/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * SCENARIO: Noisy Neighbor
 * Simulates a latency spike caused by a resource-hogging process on the same host.
 *
 * THE STORY:
 * A critical `payment-service` has suddenly slowed to a crawl, but is not reporting
 * any errors. The team is baffled as to why a healthy service is suddenly timing out.
 *
 * ROOT CAUSE:
 * The `batch-processing-service` monopolizes host CPU (`system.cpu.total.norm.pct`),
 * starving the critical `payment-service` of resources and causing high latency.
 *
 * TROUBLESHOOTING PATH (OBSERVABILITY UI):
 * 1. Start in the APM UI for the 'payment-service' and confirm the high latency spike.
 * 2. Inspect a slow trace and observe that time is spent "in-process" with no slow
 *    downstream spans. Note the 'host.name' from the trace metadata.
 * 3. Pivot to the Infrastructure UI and select the "Hosts" view. Find the affected
 *    host.
 * 4. On the host details page, correlate the latency spike with the host's CPU
 *    utilization, which spiked to 95%.
 * 5. In the "Processes" tab for the host, identify the 'batch-processing-service'
 *    as the top CPU consumer.
 *
 * TROUBLESHOOTING PATH (PLATFORM TOOLS):
 * 1. Start in Discover with the 'traces-apm-*' data view. Filter for
 *    'service.name: "payment-service"' and note the high values for
 *    'transaction.duration.us'. Note the 'host.name' for the affected service.
 * 2. In a Dashboard, create a Lens time series chart of the 95th percentile of
 *    'transaction.duration.us' for the 'payment-service'.
 * 3. Add a second chart to the dashboard. Using the 'metrics-*' data view, plot
 *    the max 'system.cpu.total.norm.pct', filtering by the correct 'host.name'.
 *    The latency spike in the first chart will perfectly correlate with the CPU
 *    spike in the second.
 * 4. To find the culprit, create a third Lens chart (Top Values) showing the max
 *    'system.process.cpu.total.norm.pct' broken down by 'process.name'. This will
 *    clearly show the 'batch-processing-service' as the top CPU consumer.
 *
 * AI ASSISTANT QUESTIONS:
 * - "Why is the payment-service so slow?"
 * - "Is the latency in the payment-service correlated with any host metrics?"
 * - "What process is using the most CPU on host-1.example.com?"
 */

import type { ApmFields, InfraDocument } from '@kbn/synthtrace-client';
import { apm, ApmSynthtracePipelineSchema, infra, timerange } from '@kbn/synthtrace-client';
import type { Scenario } from '../../cli/scenario';
import { getSynthtraceEnvironment } from '../../lib/utils/get_synthtrace_environment';
import { withClient } from '../../lib/utils/with_client';
import { parseApmScenarioOpts } from '../helpers/apm_scenario_ops_parser';

const ENVIRONMENT = getSynthtraceEnvironment(__filename);

const scenario: Scenario<InfraDocument | ApmFields> = async (runOptions) => {
  const { logger } = runOptions;
  const { pipeline = ApmSynthtracePipelineSchema.Default } = parseApmScenarioOpts(
    runOptions.scenarioOpts
  );

  return {
    generate: ({ range, clients: { apmEsClient, infraEsClient } }) => {
      const midPoint = new Date(
        range.from.getTime() + (range.to.getTime() - range.from.getTime()) / 2
      );

      const hostName = 'host-1.example.com';

      // Define the two services running on the same host
      const paymentService = apm
        .service({ name: 'payment-service', environment: ENVIRONMENT, agentName: 'java' })
        .instance('instance-payment')
        .defaults({ 'host.name': hostName });

      const batchService = apm
        .service({ name: 'batch-processing-service', environment: ENVIRONMENT, agentName: 'go' })
        .instance('instance-batch')
        .defaults({ 'host.name': hostName });

      // Healthy period for payment-service
      const healthyTimestamps = timerange(range.from, midPoint).interval('1s').rate(10);
      const healthyPaymentTraces = healthyTimestamps.generator((timestamp) =>
        paymentService
          .transaction({ transactionName: 'POST /api/charge' })
          .timestamp(timestamp)
          .duration(150) // Fast and healthy
          .success()
      );

      // Degraded period for payment-service
      const degradedTimestamps = timerange(midPoint, range.to).interval('1s').rate(10);
      const degradedPaymentTraces = degradedTimestamps.generator(
        (timestamp) =>
          paymentService
            .transaction({ transactionName: 'POST /api/charge' })
            .timestamp(timestamp)
            .duration(5000) // Extremely slow due to CPU starvation
            .success() // No errors, just slow
      );

      // Metrics for the noisy neighbor (batch-processing-service)
      const batchServiceMetrics = range
        .interval('10s')
        .rate(1)
        .generator((timestamp) => {
          const isDegraded = timestamp > midPoint.getTime();
          return batchService
            .appMetrics({
              'system.process.cpu.total.norm.pct': isDegraded ? 0.95 : 0.05, // Hogging CPU in degraded period
            })
            .timestamp(timestamp);
        });

      const host = infra.host(hostName);

      // Host metrics
      const hostMetrics = range
        .interval('10s')
        .rate(1)
        .generator((timestamp) => {
          const isDegraded = timestamp > midPoint.getTime();
          const cpuTotalValue = isDegraded ? 0.95 : 0.15;

          const defaults = {
            'agent.id': 'metricbeat-agent',
            'host.hostname': hostName,
            'host.name': hostName,
          };

          return [
            host
              .cpu({
                'system.cpu.total.norm.pct': cpuTotalValue,
                'system.cpu.user.pct': cpuTotalValue * 0.6,
                'system.cpu.system.pct': cpuTotalValue * 0.3,
                'process.cpu.pct': cpuTotalValue * 0.8,
                'system.cpu.nice.pct': 0.1,
              })
              .defaults(defaults)
              .timestamp(timestamp),
            host.memory().defaults(defaults).timestamp(timestamp),
            host.network().defaults(defaults).timestamp(timestamp),
            host.load().defaults(defaults).timestamp(timestamp),
            host.filesystem().defaults(defaults).timestamp(timestamp),
            host.diskio().defaults(defaults).timestamp(timestamp),
          ];
        });

      return [
        withClient(
          apmEsClient,
          logger.perf('generating_apm_events', () => [
            healthyPaymentTraces,
            degradedPaymentTraces,
            batchServiceMetrics,
          ])
        ),
        withClient(
          infraEsClient,
          logger.perf('generating_infra_events', () => hostMetrics)
        ),
      ];
    },
    setupPipeline: ({ apmEsClient }) =>
      apmEsClient.setPipeline(apmEsClient.resolvePipelineType(pipeline)),
  };
};

export default scenario;
