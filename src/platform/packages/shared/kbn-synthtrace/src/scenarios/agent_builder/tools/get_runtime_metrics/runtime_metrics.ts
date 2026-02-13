/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * SCENARIO: JVM Runtime Metrics
 *
 * Story: Generates JVM runtime metrics for testing the `get_runtime_metrics` tool.
 * This tool returns CPU usage, heap/non-heap memory, thread count, and GC duration
 * for Java services.
 *
 * Data Sources:
 * - Elastic APM: Uses native JVM field paths (jvm.memory.heap.*, system.process.cpu.*)
 * - OTel Stable Semconv (native ingest): Uses metrics.jvm.* with attributes.jvm.memory.type
 * - OTel Stable Semconv (APM Server ingest): Uses metrics.jvm.* with labels.jvm_memory_type
 *
 * Services:
 * - `java-payment-service` (Elastic APM, production):
 *   - High CPU (75%), moderate memory (500MB/1GB heap), 42 threads
 *
 * - `otel-order-service` (OTel native, production):
 *   - Moderate CPU (65%), high memory (400MB/800MB heap), 35 threads
 *
 * - `otel-apm-user-service` (OTel via APM Server, production):
 *   - Low CPU (55%), moderate memory (300MB/600MB heap), 28 threads
 *
 * Run via CLI:
 * ```
 * node scripts/synthtrace \
 *   src/platform/packages/shared/kbn-synthtrace/src/scenarios/agent_builder/tools/get_runtime_metrics/runtime_metrics.ts \
 *   --from "now-15m" --to "now" --clean
 * ```
 *
 * Validate via:
 * ```
 * POST kbn:///api/agent_builder/tools/_execute
 * {
 *   "tool_id": "observability.get_runtime_metrics",
 *   "tool_params": {
 *     "start": "now-15m",
 *     "end": "now"
 *   }
 * }
 * ```
 */

import type { ApmFields, Timerange } from '@kbn/synthtrace-client';
import { apm } from '@kbn/synthtrace-client';
import type { Client } from '@elastic/elasticsearch';
import type { Scenario } from '../../../../cli/scenario';
import { withClient, type ScenarioReturnType } from '../../../../lib/utils/with_client';
import type { ApmSynthtraceEsClient } from '../../../../lib/apm/client/apm_synthtrace_es_client';

// ============================================================================
// Elastic APM JVM Metrics Configuration
// ============================================================================

export interface ElasticApmJvmServiceConfig {
  name: string;
  environment: string;
  instanceName: string;
  hostName: string;
  cpuPercent: number;
  heapMemoryUsed: number;
  heapMemoryMax: number;
  nonHeapMemoryUsed: number;
  nonHeapMemoryMax: number;
  threadCount: number;
  gcTime: number;
}

export const DEFAULT_ELASTIC_APM_SERVICES: ElasticApmJvmServiceConfig[] = [
  {
    name: 'java-payment-service',
    environment: 'production',
    instanceName: 'payment-instance-1',
    hostName: 'payment-host-01',
    cpuPercent: 0.75,
    heapMemoryUsed: 500_000_000, // 500MB
    heapMemoryMax: 1_073_741_824, // 1GB
    nonHeapMemoryUsed: 50_000_000, // 50MB
    nonHeapMemoryMax: 268_435_456, // 256MB
    threadCount: 42,
    gcTime: 150, // ms
  },
];

/**
 * Generates Elastic APM JVM metrics data.
 * Uses native Elastic APM field paths: jvm.memory.heap.*, system.process.cpu.*, etc.
 */
export function generateElasticApmJvmMetrics({
  range,
  apmEsClient,
  services = DEFAULT_ELASTIC_APM_SERVICES,
}: {
  range: Timerange;
  apmEsClient: ApmSynthtraceEsClient;
  services?: ElasticApmJvmServiceConfig[];
}): ScenarioReturnType<ApmFields> {
  const data = range
    .interval('1m')
    .rate(1)
    .generator((timestamp) =>
      services.map((service) => {
        const instance = apm
          .service({ name: service.name, environment: service.environment, agentName: 'java' })
          .instance(service.instanceName);

        return instance
          .appMetrics({
            'system.process.cpu.total.norm.pct': service.cpuPercent,
            'jvm.memory.heap.used': service.heapMemoryUsed,
            'jvm.memory.heap.max': service.heapMemoryMax,
            'jvm.memory.non_heap.used': service.nonHeapMemoryUsed,
            'jvm.memory.non_heap.max': service.nonHeapMemoryMax,
            'jvm.thread.count': service.threadCount,
            'jvm.gc.time': service.gcTime,
          })
          .timestamp(timestamp);
      })
    );

  return withClient(apmEsClient, data);
}

// ============================================================================
// OTel Stable Semconv JVM Metrics Configuration
// ============================================================================

export type OtelIngestPath = 'native' | 'apm_server';

export interface OtelJvmServiceConfig {
  name: string;
  environment: string;
  instanceName: string;
  hostName: string;
  ingestPath: OtelIngestPath;
  cpuUtilization: number;
  heapMemoryUsed: number;
  heapMemoryLimit: number;
  nonHeapMemoryUsed: number;
  nonHeapMemoryLimit: number;
  threadCount: number;
  gcDurationSeconds: number;
}

export const DEFAULT_OTEL_SERVICES: OtelJvmServiceConfig[] = [
  {
    name: 'otel-order-service',
    environment: 'production',
    instanceName: 'order-instance-1',
    hostName: 'order-host-01',
    ingestPath: 'native',
    cpuUtilization: 0.65,
    heapMemoryUsed: 400_000_000, // 400MB
    heapMemoryLimit: 800_000_000, // 800MB
    nonHeapMemoryUsed: 40_000_000, // 40MB
    nonHeapMemoryLimit: 80_000_000, // 80MB
    threadCount: 35,
    gcDurationSeconds: 0.15, // 150ms
  },
  {
    name: 'otel-apm-user-service',
    environment: 'production',
    instanceName: 'user-instance-1',
    hostName: 'user-host-01',
    ingestPath: 'apm_server',
    cpuUtilization: 0.55,
    heapMemoryUsed: 300_000_000, // 300MB
    heapMemoryLimit: 600_000_000, // 600MB
    nonHeapMemoryUsed: 30_000_000, // 30MB
    nonHeapMemoryLimit: 60_000_000, // 60MB
    threadCount: 28,
    gcDurationSeconds: 0.1, // 100ms
  },
];

/**
 * Generates OTel stable semconv JVM metrics documents for direct ES indexing.
 * This is needed because synthtrace doesn't have native OTel metrics support.
 *
 * @param startMs - Start timestamp in milliseconds
 * @param endMs - End timestamp in milliseconds
 * @param services - OTel service configurations
 * @returns Array of documents ready for ES bulk indexing
 */
export function generateOtelJvmMetricsDocs({
  startMs,
  endMs,
  services = DEFAULT_OTEL_SERVICES,
}: {
  startMs: number;
  endMs: number;
  services?: OtelJvmServiceConfig[];
}): Array<{ index: string; doc: Record<string, unknown> }> {
  const docs: Array<{ index: string; doc: Record<string, unknown> }> = [];
  const intervalMs = 60_000; // 1 minute

  for (const service of services) {
    const memoryTypeField =
      service.ingestPath === 'native' ? 'attributes.jvm.memory.type' : 'labels.jvm_memory_type';

    for (let ts = startMs; ts <= endMs; ts += intervalMs) {
      const timestamp = new Date(ts).toISOString();
      const index = `metrics-apm.app.${service.name}-default`;

      // Heap memory doc
      docs.push({
        index,
        doc: {
          '@timestamp': timestamp,
          'processor.event': 'metric',
          'metricset.name': 'app',
          'service.name': service.name,
          'service.environment': service.environment,
          'service.node.name': service.instanceName,
          'host.name': service.hostName,
          'metrics.jvm.cpu.recent_utilization': service.cpuUtilization,
          'metrics.jvm.memory.used': service.heapMemoryUsed,
          'metrics.jvm.memory.limit': service.heapMemoryLimit,
          [memoryTypeField]: 'heap',
          'metrics.jvm.thread.count': service.threadCount,
          'metrics.jvm.gc.duration': service.gcDurationSeconds,
        },
      });

      // Non-heap memory doc (separate doc with different memory type)
      docs.push({
        index,
        doc: {
          '@timestamp': timestamp,
          'processor.event': 'metric',
          'metricset.name': 'app',
          'service.name': service.name,
          'service.environment': service.environment,
          'service.node.name': service.instanceName,
          'host.name': service.hostName,
          'metrics.jvm.memory.used': service.nonHeapMemoryUsed,
          'metrics.jvm.memory.limit': service.nonHeapMemoryLimit,
          [memoryTypeField]: 'non_heap',
        },
      });
    }
  }

  return docs;
}

/**
 * Indexes OTel JVM metrics documents directly to Elasticsearch.
 * Used by tests and the CLI bootstrap phase.
 */
export async function indexOtelJvmMetrics({
  esClient,
  startMs,
  endMs,
  services = DEFAULT_OTEL_SERVICES,
}: {
  esClient: Client;
  startMs: number;
  endMs: number;
  services?: OtelJvmServiceConfig[];
}): Promise<void> {
  const docs = generateOtelJvmMetricsDocs({ startMs, endMs, services });

  if (docs.length === 0) {
    return;
  }

  const body = docs.flatMap(({ index, doc }) => [{ create: { _index: index } }, doc]);

  await esClient.bulk({ body, refresh: true });
}

/**
 * Cleans up OTel JVM metrics documents from Elasticsearch.
 */
export async function cleanupOtelJvmMetrics({
  esClient,
  services = DEFAULT_OTEL_SERVICES,
}: {
  esClient: Client;
  services?: OtelJvmServiceConfig[];
}): Promise<void> {
  for (const service of services) {
    const index = `metrics-apm.app.${service.name}-default`;
    await esClient
      .deleteByQuery({
        index,
        query: { match_all: {} },
        refresh: true,
        ignore_unavailable: true,
      })
      .catch(() => {
        // Ignore errors if index doesn't exist
      });
  }
}

// ============================================================================
// CLI Scenario Export
// ============================================================================

const scenario: Scenario<ApmFields> = async ({ from, to, logger }) => ({
  bootstrap: async (_synthtraceClients, _kibanaClient, esClient) => {
    logger.info('Indexing OTel JVM metrics (stable semconv)...');
    await indexOtelJvmMetrics({
      esClient,
      startMs: from,
      endMs: to,
      services: DEFAULT_OTEL_SERVICES,
    });
    logger.info(
      `Indexed OTel JVM metrics for ${DEFAULT_OTEL_SERVICES.length} services (native + APM Server ingest)`
    );
  },

  generate: ({ range, clients: { apmEsClient } }) => {
    return generateElasticApmJvmMetrics({
      range,
      apmEsClient,
      services: DEFAULT_ELASTIC_APM_SERVICES,
    });
  },

  teardown: async (_synthtraceClients, _kibanaClient, esClient) => {
    logger.info('Cleaning up OTel JVM metrics...');
    await cleanupOtelJvmMetrics({ esClient, services: DEFAULT_OTEL_SERVICES });
  },
});

export default scenario;
