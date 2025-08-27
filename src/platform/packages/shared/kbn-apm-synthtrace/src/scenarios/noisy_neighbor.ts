/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ApmFields, InfraDocument } from '@kbn/apm-synthtrace-client';
import { apm, ApmSynthtracePipelineSchema, infra, timerange } from '@kbn/apm-synthtrace-client';
import type { Scenario } from '../cli/scenario';
import { getSynthtraceEnvironment } from '../lib/utils/get_synthtrace_environment';
import { withClient } from '../lib/utils/with_client';
import { parseApmScenarioOpts } from './helpers/apm_scenario_ops_parser';

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
          const cpuTotalValue = isDegraded ? 0.9 : 0.1;

          return [
            host
              .cpu({
                'process.cpu.pct': isDegraded ? 0.9 : 0.1,
                'system.cpu.nice.pct': isDegraded ? 0.9 : 0.1,
                'system.cpu.system.pct': cpuTotalValue * 0.2,
                'system.cpu.total.norm.pct': cpuTotalValue,
                'system.cpu.user.pct': cpuTotalValue * 0.2,
              })
              .timestamp(timestamp),
            host.memory().timestamp(timestamp),
            host.network().timestamp(timestamp),
            host.load().timestamp(timestamp),
            host.filesystem().timestamp(timestamp),
            host.diskio().timestamp(timestamp),
          ].map((metric) =>
            metric.defaults({
              'host.name': host.fields['host.name'],
              'host.hostname': host.fields['host.name'],
              'agent.id': 'some-agent',
              'service.name': 'batch-processing-service',
              'system.memory.actual.free': 500 + Math.floor(Math.random() * 500),
              'system.memory.total': 1000,
              'system.cpu.total.norm.pct': 0.5 + Math.random() * 0.25,
            })
          );
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
