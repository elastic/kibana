/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * SCENARIO: Service-Host Correlation (OTel format)
 *
 * Story: A host is under CPU pressure, causing services running on it to degrade.
 * This tests the AI insight's ability to correlate service latency with host metrics.
 *
 * Setup:
 * - `otel-host-01`: 95% CPU, 80% memory (under pressure)
 *   - Services: `checkout-service` (high latency), `payment-service` (high latency)
 *
 * - `otel-host-02`: 30% CPU, 40% memory (healthy)
 *   - Services: `inventory-service` (normal latency)
 *
 * Expected AI Insight:
 * - Alert on checkout-service latency
 * - Insight correlates with host CPU pressure
 * - Shows other affected services on same host
 *
 * Usage:
 * ```
 * node scripts/synthtrace \
 *   src/platform/packages/shared/kbn-synthtrace/src/scenarios/agent_builder/ai_insights/alert/service_host_correlation.ts \
 *   --from "now-15m" --to "now" --clean
 * ```
 *
 * Then create a latency threshold alert for checkout-service and call:
 * ```
 * POST /internal/observability_agent_builder/ai_insights/alert
 * { "alert_id": "<your_alert_id>" }
 * ```
 */

import { Serializable, apm, ApmSynthtracePipelineSchema } from '@kbn/synthtrace-client';
import type { Scenario } from '../../../../cli/scenario';
import { withClient } from '../../../../lib/utils/with_client';

interface HostConfig {
  name: string;
  cpuUsage: number;
  memoryUsage: number;
  services: Array<{
    name: string;
    latencyMs: number;
    errorRate: number;
  }>;
}

const HOSTS: HostConfig[] = [
  {
    name: 'otel-host-01',
    cpuUsage: 0.95, // 95% CPU - under pressure
    memoryUsage: 0.8, // 80% memory
    services: [
      { name: 'checkout-service', latencyMs: 2500, errorRate: 0.15 }, // Degraded
      { name: 'payment-service', latencyMs: 1800, errorRate: 0.1 }, // Degraded
    ],
  },
  {
    name: 'otel-host-02',
    cpuUsage: 0.3, // 30% CPU - healthy
    memoryUsage: 0.4, // 40% memory
    services: [{ name: 'inventory-service', latencyMs: 100, errorRate: 0.01 }], // Healthy
  },
];

const scenario: Scenario<any> = async ({ logger }) => {
  return {
    generate: ({ range, clients: { infraEsClient, apmEsClient } }) => {
      // Generate OTel host metrics (semconv format)
      const hostMetrics = range
        .interval('30s')
        .rate(1)
        .generator((timestamp) =>
          HOSTS.flatMap((host) => {
            const base = {
              'agent.id': `agent-${host.name}`,
              'host.hostname': host.name,
              '@timestamp': timestamp,
              'host.name': host.name,
              'host.os.name': 'linux',
              'cloud.provider': 'aws',
              'cloud.region': 'us-east-1',
              'host.ip': '10.0.0.1',
              'resource.attributes.host.name': host.name,
              'resource.attributes.os.type': 'linux',
              'data_stream.dataset': 'hostmetricsreceiver.otel',
              'data_stream.type': 'metrics',
              'data_stream.namespace': 'default',
            };

            // CPU metrics with state dimension (OTel hostmetricsreceiver format)
            // cpuV2 aggregation calculates: 1 - sum(idle + wait)
            const cpuIdleUtilization = 1 - host.cpuUsage;
            const cpuWaitUtilization = 0;
            const cpuDocs = [
              { state: 'idle', 'system.cpu.utilization': cpuIdleUtilization },
              { state: 'wait', 'system.cpu.utilization': cpuWaitUtilization },
              { state: 'user', 'system.cpu.utilization': host.cpuUsage * 0.7 },
              { state: 'system', 'system.cpu.utilization': host.cpuUsage * 0.3 },
            ].map((cpu) => ({
              ...base,
              ...cpu,
              'metricset.name': 'cpu',
              'system.cpu.logical.count': 4,
              'system.cpu.load_average.1m': host.cpuUsage * 4, // Load proportional to CPU
            }));

            // Memory metrics with state dimension
            const totalMemory = 16 * 1024 * 1024 * 1024; // 16GB
            const usedMemory = totalMemory * host.memoryUsage;
            const freeMemory = totalMemory - usedMemory;
            const memDocs = [
              {
                state: 'used',
                'system.memory.utilization': host.memoryUsage,
                'system.memory.usage': usedMemory,
              },
              {
                state: 'free',
                'system.memory.utilization': 1 - host.memoryUsage,
                'system.memory.usage': freeMemory,
              },
              {
                state: 'cached',
                'system.memory.utilization': 0.1,
                'system.memory.usage': totalMemory * 0.1,
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
              'metrics.system.filesystem.utilization': 0.5,
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
          })
        );

      // Generate OTel APM traces for services
      const apmTraces = range
        .interval('30s')
        .rate(5)
        .generator((timestamp) =>
          HOSTS.flatMap((host) =>
            host.services.flatMap((service) => {
              const instance = apm
                .otelService({
                  name: service.name,
                  sdkName: 'opentelemetry',
                  sdkLanguage: 'nodejs',
                  namespace: 'production',
                })
                .instance(`${service.name}-instance`)
                .hostName(host.name); // Critical: links APM to host metrics

              const isError = Math.random() < service.errorRate;

              return instance
                .span({ name: 'POST /api/process', kind: 'Server' })
                .timestamp(timestamp)
                .duration(service.latencyMs + Math.random() * 200) // Add some variance
                .outcome(isError ? 'failure' : 'success');
            })
          )
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
