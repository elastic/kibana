/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Simulates a "noisy neighbor" incident where the root cause is in the
 * underlying infrastructure, not the application code.
 *
 * The Demo Story:
 * "Our most critical service, the `payment-service`, has suddenly slowed to a crawl.
 * Latency has jumped from 150ms to over 5 seconds. Alerts are firing for 'High 99th
 * Percentile Latency'. There have been no new deployments, and the service isn't
 * reporting any errors. The team is baffled."
 *
 * What this scenario generates:
 * The `payment-service` experiences a massive latency spike. The root cause is not
 * in its code, but a separate `batch-processing-service` running on the same host
 * which begins consuming 95% of the CPU, starving the payment service of resources.
 */

import type { ApmFields, InfraDocument } from '@kbn/apm-synthtrace-client';
import { apm, ApmSynthtracePipelineSchema, infra, timerange } from '@kbn/apm-synthtrace-client';
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
