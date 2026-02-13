/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * SCENARIO: Host → Service Correlation (OTel format)
 *
 * Story: A host has high CPU because one service running on it is misbehaving.
 * This tests the AI insight's ability to identify which service is causing host resource pressure.
 *
 * Setup:
 * - `otel-host-03`: 95% CPU, 85% memory (under pressure)
 *   - Services:
 *     - `order-processor` (HIGH latency 3s, 20% error rate) ← the culprit
 *     - `api-gateway` (normal latency 80ms, 0.5% error rate) ← healthy
 *     - `cache-service` (normal latency 5ms, 0.1% error rate) ← healthy
 *
 * Expected AI Insight:
 * - Alert on host CPU threshold
 * - Insight finds services running on the host
 * - Identifies `order-processor` as likely cause due to degraded APM metrics
 *
 * Usage:
 * ```
 * node scripts/synthtrace \
 *   src/platform/packages/shared/kbn-synthtrace/src/scenarios/agent_builder/ai_insights/alert/host_service_correlation.ts \
 *   --from "now-15m" --to "now" --clean
 * ```
 *
 * Then create an inventory threshold alert for host CPU and call:
 * ```
 * POST /internal/observability_agent_builder/ai_insights/alert
 * { "alert_id": "<your_alert_id>" }
 * ```
 */

import { Serializable, apm, ApmSynthtracePipelineSchema } from '@kbn/synthtrace-client';
import type { Scenario } from '../../../../cli/scenario';
import { withClient } from '../../../../lib/utils/with_client';

interface ServiceConfig {
  name: string;
  latencyMs: number;
  errorRate: number;
}

interface HostConfig {
  name: string;
  cpuUsage: number;
  memoryUsage: number;
  services: ServiceConfig[];
}

const HOST: HostConfig = {
  name: 'otel-host-03',
  cpuUsage: 0.95, // 95% CPU - under pressure
  memoryUsage: 0.85, // 85% memory
  services: [
    // The culprit - high latency and errors
    { name: 'order-processor', latencyMs: 3000, errorRate: 0.2 },
    // Healthy services
    { name: 'api-gateway', latencyMs: 80, errorRate: 0.005 },
    { name: 'cache-service', latencyMs: 5, errorRate: 0.001 },
  ],
};

const scenario: Scenario<any> = async ({ logger }) => {
  return {
    generate: ({ range, clients: { infraEsClient, apmEsClient } }) => {
      // Generate OTel host metrics (semconv format)
      const hostMetrics = range
        .interval('30s')
        .rate(1)
        .generator((timestamp) => {
          const base = {
            'agent.id': `agent-${HOST.name}`,
            'host.hostname': HOST.name,
            '@timestamp': timestamp,
            'host.name': HOST.name,
            'host.os.name': 'linux',
            'cloud.provider': 'aws',
            'cloud.region': 'us-west-2',
            'host.ip': '10.0.1.50',
            'resource.attributes.host.name': HOST.name,
            'resource.attributes.os.type': 'linux',
            'data_stream.dataset': 'hostmetricsreceiver.otel',
            'data_stream.type': 'metrics',
            'data_stream.namespace': 'default',
          };

          // CPU metrics with state dimension (OTel hostmetricsreceiver format)
          // cpuV2 aggregation calculates: 1 - sum(idle + wait)
          const cpuIdleUtilization = 1 - HOST.cpuUsage;
          const cpuWaitUtilization = 0;
          const cpuDocs = [
            { state: 'idle', 'system.cpu.utilization': cpuIdleUtilization },
            { state: 'wait', 'system.cpu.utilization': cpuWaitUtilization },
            { state: 'user', 'system.cpu.utilization': HOST.cpuUsage * 0.7 },
            { state: 'system', 'system.cpu.utilization': HOST.cpuUsage * 0.3 },
          ].map((cpu) => ({
            ...base,
            ...cpu,
            'metricset.name': 'cpu',
            'system.cpu.logical.count': 8,
            'system.cpu.load_average.1m': HOST.cpuUsage * 8,
          }));

          // Memory metrics with state dimension
          const totalMemory = 32 * 1024 * 1024 * 1024; // 32GB
          const usedMemory = totalMemory * HOST.memoryUsage;
          const freeMemory = totalMemory - usedMemory;
          const memDocs = [
            {
              state: 'used',
              'system.memory.utilization': HOST.memoryUsage,
              'system.memory.usage': usedMemory,
            },
            {
              state: 'free',
              'system.memory.utilization': 1 - HOST.memoryUsage,
              'system.memory.usage': freeMemory,
            },
            {
              state: 'cached',
              'system.memory.utilization': 0.05,
              'system.memory.usage': totalMemory * 0.05,
            },
          ].map((mem) => ({
            ...base,
            ...mem,
            'metricset.name': 'memory',
          }));

          // Filesystem metrics
          const diskDoc = {
            ...base,
            'metricset.name': 'filesystem',
            'metrics.system.filesystem.utilization': 0.6,
          };

          // Network metrics
          const networkDocs = [
            { direction: 'transmit', 'system.network.io': Math.floor(Math.random() * 1e9) },
            { direction: 'receive', 'system.network.io': Math.floor(Math.random() * 1e9) },
          ].map((net) => ({
            ...base,
            ...net,
            'metricset.name': 'network',
            'device.keyword': 'eth0',
          }));

          return [...cpuDocs, ...memDocs, diskDoc, ...networkDocs].map(
            (doc) => new Serializable(doc)
          );
        });

      // Generate OTel APM traces for services on this host
      const apmTraces = range
        .interval('30s')
        .rate(5)
        .generator((timestamp) =>
          HOST.services.flatMap((service) => {
            const instance = apm
              .otelService({
                name: service.name,
                sdkName: 'opentelemetry',
                sdkLanguage: 'java',
                namespace: 'production',
              })
              .instance(`${service.name}-instance-1`)
              .hostName(HOST.name); // Critical: links APM to host metrics

            const isError = Math.random() < service.errorRate;

            return instance
              .span({ name: 'POST /api/process', kind: 'Server' })
              .timestamp(timestamp)
              .duration(service.latencyMs + Math.random() * (service.latencyMs * 0.2))
              .outcome(isError ? 'failure' : 'success');
          })
        );

      return [
        withClient(
          infraEsClient,
          logger.perf('generating_otel_host_metrics', () => hostMetrics)
        ),
        withClient(
          apmEsClient,
          logger.perf('generating_otel_apm_traces', () => apmTraces)
        ),
      ];
    },

    setupPipeline({ apmEsClient }) {
      apmEsClient.setPipeline(apmEsClient.resolvePipelineType(ApmSynthtracePipelineSchema.Otel));
    },
  };
};

export default scenario;
