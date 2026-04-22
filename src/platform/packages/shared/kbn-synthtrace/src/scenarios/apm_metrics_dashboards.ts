/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Generates one APM service per entry in the metrics dashboard catalog, covering
 * all static dashboard types (classic APM, EDOT, vanilla OTel, OTel-native) plus
 * non-dashboard variations (JRuby JVM metrics, Go classic agent, Ruby classic).
 *
 * Each service emits transactions and the exact metric fields its corresponding
 * dashboard panels query so the panels render with data.
 *
 * Usage:
 *   node scripts/synthtrace apm_metrics_dashboards --live
 */

import type { ApmFields } from '@kbn/synthtrace-client';
import { apm } from '@kbn/synthtrace-client';
import type { Scenario } from '../cli/scenario';
import { getSynthtraceEnvironment } from '../lib/utils/get_synthtrace_environment';
import { withClient } from '../lib/utils/with_client';

const ENVIRONMENT = getSynthtraceEnvironment(__filename);

interface ServiceConfig {
  name: string;
  agentName: string;
  runtimeVersion?: string;
  runtimeName?: string;
  telemetrySdkName?: string;
  telemetrySdkLanguage?: string;
  extraMetrics?: Record<string, unknown> | Array<Record<string, unknown>>;
}

const SYSTEM_METRICS: Record<string, unknown> = {
  'system.cpu.total.norm.pct': 0.4,
  'system.process.cpu.total.norm.pct': 0.2,
  'system.memory.actual.free': 2_000_000_000,
  'system.memory.total': 8_000_000_000,
  'system.process.memory.rss.bytes': 500_000_000,
};

const JAVA_APM_METRICS: Record<string, unknown> = {
  ...SYSTEM_METRICS,
  'jvm.memory.heap.used': 300_000_000,
  'jvm.memory.heap.max': 512_000_000,
  'jvm.memory.heap.committed': 400_000_000,
  'jvm.memory.heap.pool.used': 200_000_000,
  'jvm.memory.heap.pool.max': 256_000_000,
  'jvm.memory.heap.pool.committed': 250_000_000,
  'jvm.memory.non_heap.used': 100_000_000,
  'jvm.memory.non_heap.committed': 120_000_000,
  'jvm.thread.count': 42,
  'jvm.gc.time': 150,
  'jvm.gc.count': 10,
  'jvm.gc.alloc': 50_000_000,
  'labels.name': 'G1 Old Gen',
};

const NODEJS_APM_METRICS: Record<string, unknown> = {
  ...SYSTEM_METRICS,
  'nodejs.eventloop.delay.avg.ms': 1.5,
  'nodejs.handles.active': 12,
  'nodejs.requests.active': 3,
  'nodejs.memory.heap.allocated.bytes': 50_000_000,
  'nodejs.memory.heap.used.bytes': 30_000_000,
  'nodejs.memory.external.bytes': 5_000_000,
  'nodejs.memory.arrayBuffers.bytes': 2_000_000,
};

const OTEL_JAVA_HEAP_METRICS: Record<string, unknown> = {
  'jvm.cpu.recent_utilization': 0.3,
  'jvm.system.cpu.utilization': 0.5,
  'jvm.memory.committed': 400_000_000,
  'jvm.memory.limit': 512_000_000,
  'jvm.memory.used': 300_000_000,
  'jvm.thread.count': 42,
  'labels.jvm_memory_pool_name': 'G1 Old Gen',
  'labels.jvm_memory_type': 'heap',
};

const OTEL_JAVA_NON_HEAP_METRICS: Record<string, unknown> = {
  'jvm.cpu.recent_utilization': 0.3,
  'jvm.system.cpu.utilization': 0.5,
  'jvm.memory.committed': 120_000_000,
  'jvm.memory.limit': 256_000_000,
  'jvm.memory.used': 100_000_000,
  'jvm.thread.count': 42,
  'labels.jvm_memory_pool_name': 'Metaspace',
  'labels.jvm_memory_type': 'non_heap',
};

const OTEL_NODEJS_METRICS: Record<string, unknown> = {
  'nodejs.eventloop.delay.p50': 1.2,
  'nodejs.eventloop.delay.p90': 3.5,
  'nodejs.eventloop.utilization': 0.15,
  'process.cpu.utilization': 0.25,
  'process.memory.usage': 100_000_000,
};

const OTEL_DOTNET_METRICS: Record<string, unknown> = {
  'process.memory.usage': 150_000_000,
  'process.runtime.dotnet.gc.collections.count': 25,
  'process.runtime.dotnet.gc.heap.size': 80_000_000,
  'process.runtime.dotnet.thread_pool.threads.count': 10,
};

const OTEL_NATIVE_EDOT_JAVA_METRICS: Record<string, unknown> = {
  'jvm.cpu.recent_utilization': 0.3,
  'jvm.system.cpu.utilization': 0.5,
  'jvm.memory.used': 300_000_000,
  'jvm.memory.limit': 512_000_000,
  'jvm.memory.committed': 400_000_000,
  'jvm.memory.used_after_last_gc': 250_000_000,
  'jvm.memory.type': 'heap',
  'jvm.memory.pool.name': 'G1 Old Gen',
  'jvm.thread.count': 42,
  'jvm.thread.state': 'runnable',
  'jvm.thread.daemon': true,
  'jvm.class.count': 8500,
  'jvm.gc.action': 'end of major GC',
  'jvm.gc.name': 'G1 Old Generation',
};

const OTEL_NATIVE_OTHER_JAVA_METRICS: Record<string, unknown> = {
  'jvm.cpu.recent_utilization': 0.3,
  'jvm.memory.used': 300_000_000,
  'jvm.memory.limit': 512_000_000,
  'jvm.memory.committed': 400_000_000,
  'jvm.memory.used_after_last_gc': 250_000_000,
  'jvm.memory.type': 'heap',
  'jvm.memory.pool.name': 'G1 Old Gen',
  'jvm.thread.count': 42,
  'jvm.thread.state': 'runnable',
  'jvm.thread.daemon': true,
  'jvm.class.count': 8500,
};

const OTEL_PYTHON_METRICS: Record<string, unknown> = {
  'cpython.gc.collected_objects': 500,
  'cpython.gc.collections': 20,
  'cpython.gc.uncollectable_objects': 0,
  'process.runtime.cpython.memory': 80_000_000,
};

const OTEL_GO_METRICS: Record<string, unknown> = {
  'go.goroutine.count': 50,
  'go.memory.allocated': 30_000_000,
  'go.memory.allocations': 100_000,
  'go.memory.gc.goal': 60_000_000,
  'go.memory.used': 45_000_000,
  'go.processor.limit': 8,
};

const SERVICES: ServiceConfig[] = [
  // --- classic_apm (no telemetry.sdk.* fields) ---
  { name: 'metrics-classic-apm-java', agentName: 'java', extraMetrics: JAVA_APM_METRICS },
  { name: 'metrics-classic-apm-nodejs', agentName: 'nodejs', extraMetrics: NODEJS_APM_METRICS },

  // --- classic_apm + edot ---
  {
    name: 'metrics-classic-edot-java',
    agentName: 'opentelemetry/java/elastic',
    extraMetrics: [OTEL_JAVA_HEAP_METRICS, OTEL_JAVA_NON_HEAP_METRICS],
  },
  {
    name: 'metrics-classic-edot-nodejs',
    agentName: 'opentelemetry/nodejs/elastic',
    extraMetrics: OTEL_NODEJS_METRICS,
  },
  {
    name: 'metrics-classic-edot-dotnet-v9',
    agentName: 'opentelemetry/dotnet/elastic',
    runtimeVersion: '9.0.0',
    extraMetrics: OTEL_DOTNET_METRICS,
  },
  {
    name: 'metrics-classic-edot-dotnet-v8',
    agentName: 'opentelemetry/dotnet/elastic',
    runtimeVersion: '8.0.11',
    extraMetrics: OTEL_DOTNET_METRICS,
  },

  // --- classic_apm + otel_other ---
  {
    name: 'metrics-classic-otel-java',
    agentName: 'opentelemetry/java',
    extraMetrics: [OTEL_JAVA_HEAP_METRICS, OTEL_JAVA_NON_HEAP_METRICS],
  },
  {
    name: 'metrics-classic-otel-nodejs',
    agentName: 'opentelemetry/nodejs',
    extraMetrics: OTEL_NODEJS_METRICS,
  },
  {
    name: 'metrics-classic-otel-dotnet',
    agentName: 'opentelemetry/dotnet',
    extraMetrics: OTEL_DOTNET_METRICS,
  },
  { name: 'metrics-classic-otel-go', agentName: 'opentelemetry/go', extraMetrics: OTEL_GO_METRICS },

  // --- otel_native + edot (telemetry.sdk.name = opentelemetry) ---
  {
    name: 'metrics-native-edot-java',
    agentName: 'opentelemetry/java/elastic',
    telemetrySdkName: 'opentelemetry',
    telemetrySdkLanguage: 'java',
    extraMetrics: OTEL_NATIVE_EDOT_JAVA_METRICS,
  },
  {
    name: 'metrics-native-edot-nodejs',
    agentName: 'opentelemetry/nodejs/elastic',
    telemetrySdkName: 'opentelemetry',
    telemetrySdkLanguage: 'nodejs',
    extraMetrics: OTEL_NODEJS_METRICS,
  },
  {
    name: 'metrics-native-edot-python',
    agentName: 'opentelemetry/python/elastic',
    telemetrySdkName: 'opentelemetry',
    telemetrySdkLanguage: 'python',
    extraMetrics: OTEL_PYTHON_METRICS,
  },

  // --- otel_native + otel_other ---
  {
    name: 'metrics-native-otel-java',
    agentName: 'opentelemetry/java',
    telemetrySdkName: 'opentelemetry',
    telemetrySdkLanguage: 'java',
    extraMetrics: OTEL_NATIVE_OTHER_JAVA_METRICS,
  },
  {
    name: 'metrics-native-otel-nodejs',
    agentName: 'opentelemetry/nodejs',
    telemetrySdkName: 'opentelemetry',
    telemetrySdkLanguage: 'nodejs',
    extraMetrics: OTEL_NODEJS_METRICS,
  },
  {
    name: 'metrics-native-otel-python',
    agentName: 'opentelemetry/python',
    telemetrySdkName: 'opentelemetry',
    telemetrySdkLanguage: 'python',
    extraMetrics: OTEL_PYTHON_METRICS,
  },
  {
    name: 'metrics-native-otel-go',
    agentName: 'opentelemetry/go',
    telemetrySdkName: 'opentelemetry',
    telemetrySdkLanguage: 'go',
    extraMetrics: OTEL_GO_METRICS,
  },

  // --- Non-dashboard variations ---
  {
    name: 'metrics-ruby-jruby',
    agentName: 'ruby',
    runtimeName: 'jruby',
    extraMetrics: {
      ...SYSTEM_METRICS,
      'jvm.memory.heap.used': 200_000_000,
      'jvm.memory.heap.max': 512_000_000,
      'jvm.memory.non_heap.used': 80_000_000,
      'jvm.thread.count': 30,
      'jvm.gc.time': 100,
      'jvm.gc.count': 5,
    },
  },
  { name: 'metrics-go-classic', agentName: 'go', extraMetrics: SYSTEM_METRICS },
  { name: 'metrics-ruby-classic', agentName: 'ruby', extraMetrics: SYSTEM_METRICS },
];

const scenario: Scenario<ApmFields> = async () => {
  return {
    generate: ({ range, clients: { apmEsClient } }) => {
      const instances = SERVICES.map((config) => {
        const instance = apm
          .service({ name: config.name, environment: ENVIRONMENT, agentName: config.agentName })
          .instance(`${config.name}-instance`);

        const fields = instance.fields as Record<string, unknown>;
        if (config.runtimeVersion) fields['service.runtime.version'] = config.runtimeVersion;
        if (config.runtimeName) fields['service.runtime.name'] = config.runtimeName;
        if (config.telemetrySdkName) fields['telemetry.sdk.name'] = config.telemetrySdkName;
        if (config.telemetrySdkLanguage)
          fields['telemetry.sdk.language'] = config.telemetrySdkLanguage;

        return { instance, config };
      });

      return withClient(
        apmEsClient,
        instances.flatMap(({ instance, config }) => [
          range
            .interval('1m')
            .rate(10)
            .generator((timestamp) =>
              instance
                .transaction({ transactionName: 'GET /api/data' })
                .timestamp(timestamp)
                .duration(200)
                .success()
            ),
          range
            .interval('30s')
            .rate(1)
            .generator((timestamp) => {
              const baseMetrics = {
                'system.cpu.total.norm.pct': 0.4,
                'system.memory.actual.free': 2_000_000_000,
                'system.memory.total': 8_000_000_000,
              };

              const extraList = Array.isArray(config.extraMetrics)
                ? config.extraMetrics
                : config.extraMetrics
                ? [config.extraMetrics]
                : [{}];

              return extraList.map((extra) => {
                const metricset = instance.appMetrics(baseMetrics).timestamp(timestamp);
                Object.assign(metricset.fields, extra);
                return metricset;
              });
            }),
        ])
      );
    },
  };
};

export default scenario;
