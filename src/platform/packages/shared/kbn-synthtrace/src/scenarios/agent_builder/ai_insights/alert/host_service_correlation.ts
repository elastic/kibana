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
 *     - `order-processor` (50ms latency, 100% error rate) ← the culprit, fail-fast crash loop
 *     - `api-gateway` (normal latency 80ms, 0.5% error rate) ← healthy
 *     - `cache-service` (normal latency 5ms, 0.1% error rate) ← healthy
 *
 * Expected AI Insight:
 * - Alert on host CPU threshold
 * - Insight finds services running on the host
 * - Insight finds error logs from `order-processor` (OutOfMemoryError, connection pool exhausted, etc.)
 * - Identifies `order-processor` as the cause based on 100% error rate + error logs
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

import { Serializable, apm, otelLog, ApmSynthtracePipelineSchema } from '@kbn/synthtrace-client';
import type { Scenario } from '../../../../cli/scenario';
import { withClient } from '../../../../lib/utils/with_client';

// Error messages for order-processor crash loop
const ORDER_PROCESSOR_ERRORS = [
  'java.lang.OutOfMemoryError: Java heap space',
  'FATAL: Connection pool exhausted - cannot acquire database connection',
  'java.lang.NullPointerException at com.orders.OrderService.processOrder(OrderService.java:142)',
  'ERROR: Circuit breaker open - downstream payment-service unavailable',
  'CRITICAL: Message queue consumer crashed - restarting in 5s',
  'java.util.concurrent.RejectedExecutionException: Thread pool saturated',
];

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
    // The culprit - completely broken, failing fast with 100% errors
    { name: 'order-processor', latencyMs: 50, errorRate: 1.0 },
    // Healthy services
    { name: 'api-gateway', latencyMs: 80, errorRate: 0.005 },
    { name: 'cache-service', latencyMs: 5, errorRate: 0.001 },
  ],
};

const scenario: Scenario<any> = async ({ logger }) => {
  return {
    generate: ({ range, clients: { infraEsClient, apmEsClient, logsEsClient } }) => {
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

      // Generate OTel error logs for order-processor (the broken service)
      const errorLogs = range
        .interval('30s')
        .rate(3) // Multiple errors per interval
        .generator((timestamp) => {
          const errorMessage =
            ORDER_PROCESSOR_ERRORS[Math.floor(Math.random() * ORDER_PROCESSOR_ERRORS.length)];

          return otelLog
            .create()
            .message(errorMessage)
            .logLevel('error')
            .service('order-processor')
            .hostName(HOST.name)
            .addResourceAttributes({
              'service.environment': 'production',
            })
            .addAttributes({
              'error.type': 'crash',
            })
            .timestamp(timestamp);
        });

      return [
        withClient(
          infraEsClient,
          logger.perf('generating_otel_host_metrics', () => hostMetrics)
        ),
        withClient(
          apmEsClient,
          logger.perf('generating_otel_apm_traces', () => apmTraces)
        ),
        withClient(
          logsEsClient,
          logger.perf('generating_error_logs', () => errorLogs)
        ),
      ];
    },

    setupPipeline({ apmEsClient }) {
      apmEsClient.setPipeline(apmEsClient.resolvePipelineType(ApmSynthtracePipelineSchema.Otel));
    },
  };
};

export default scenario;
