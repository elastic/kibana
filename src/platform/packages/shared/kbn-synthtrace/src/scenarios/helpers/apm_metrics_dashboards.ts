/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { apm } from '@kbn/synthtrace-client';
import type { ApmFields, Instance } from '@kbn/synthtrace-client';

export interface ApmMetricsServiceConfig {
  name: string;
  agentName: string;
  runtimeVersion?: string;
  runtimeName?: string;
  telemetrySdkName?: string;
  telemetrySdkLanguage?: string;
  extraMetrics?: Record<string, unknown> | Array<Record<string, unknown>>;
}

export const APM_METRICS_SERVICE_NAMES = {
  JAVA_APM: 'metrics-java-apm',
  NODEJS_APM: 'metrics-nodejs-apm',
  RUBY_JRUBY: 'metrics-ruby-jruby',
  EDOT_JAVA: 'metrics-edot-java',
  EDOT_NODEJS: 'metrics-edot-nodejs',
  EDOT_DOTNET_V9: 'metrics-edot-dotnet-v9',
  EDOT_DOTNET_V8: 'metrics-edot-dotnet-v8',
  OTEL_JAVA: 'metrics-otel-java',
  OTEL_NODEJS: 'metrics-otel-nodejs',
  OTEL_DOTNET: 'metrics-otel-dotnet',
  OTEL_GO: 'metrics-otel-go',
  OTEL_NATIVE_EDOT_JAVA: 'metrics-on-edot-java',
  OTEL_NATIVE_EDOT_NODEJS: 'metrics-on-edot-nodejs',
  OTEL_NATIVE_EDOT_PYTHON: 'metrics-on-edot-python',
  OTEL_NATIVE_OTEL_JAVA: 'metrics-on-otel-java',
  OTEL_NATIVE_OTEL_NODEJS: 'metrics-on-otel-nodejs',
  OTEL_NATIVE_OTEL_PYTHON: 'metrics-on-otel-python',
  OTEL_NATIVE_OTEL_GO: 'metrics-on-otel-go',
  GO_CLASSIC: 'metrics-go-classic',
  RUBY_CLASSIC: 'metrics-ruby-classic',
  RUST: 'metrics-rust',
} as const;

/*
 * Each *_METRICS map below is the source-of-truth for the values seeded into
 * Elasticsearch by the synthtrace scenario / Scout fixture, AND the values
 * APM Scout tests assert against. When tweaking a number here, update the
 * corresponding assertion in any APM Scout spec under
 * `x-pack/solutions/observability/plugins/apm/test/scout/` (currently the UI
 * `metrics_dashboards.spec.ts` / `metrics_non_dashboard.spec.ts` and the API
 * `service_overview/metrics.spec.ts`).
 *
 * Constant -> consumers:
 *   SYSTEM_METRICS                 -> CPU / System Memory panels in every classic_apm dashboard
 *   JAVA_APM_METRICS               -> dashboards/java.json
 *   NODEJS_APM_METRICS             -> dashboards/nodejs.json
 *   OTEL_JAVA_*_METRICS (x2)       -> dashboards/opentelemetry_java.json
 *   OTEL_NODEJS_METRICS            -> opentelemetry_nodejs.json + otel_native-{edot,otel_other}-nodejs.json
 *   OTEL_DOTNET_METRICS            -> opentelemetry_dotnet.json + opentelemetry_dotnet_lte_v8.json
 *   OTEL_NATIVE_EDOT_JAVA_METRICS  -> otel_native-edot-java.json
 *   OTEL_NATIVE_OTHER_JAVA_METRICS -> otel_native-otel_other-java.json
 *   OTEL_PYTHON_METRICS            -> otel_native-{edot,otel_other}-python.json
 *   OTEL_GO_METRICS                -> otel_native-otel_other-go.json
 *   RUBY_JRUBY_METRICS             -> JVM table on the metrics tab (non-dashboard variation)
 *                                     and the JVM nodes / charts API specs.
 */

export const SYSTEM_METRICS: Record<string, unknown> = {
  'system.cpu.total.norm.pct': 0.4,
  'system.process.cpu.total.norm.pct': 0.2,
  'system.memory.actual.free': 2_000_000_000,
  'system.memory.total': 8_000_000_000,
  'system.process.memory.rss.bytes': 500_000_000,
};

export const JAVA_APM_METRICS: Record<string, unknown> = {
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

export const NODEJS_APM_METRICS: Record<string, unknown> = {
  ...SYSTEM_METRICS,
  'nodejs.eventloop.delay.avg.ms': 1.5,
  'nodejs.handles.active': 12,
  'nodejs.requests.active': 3,
  'nodejs.memory.heap.allocated.bytes': 50_000_000,
  'nodejs.memory.heap.used.bytes': 30_000_000,
  'nodejs.memory.external.bytes': 5_000_000,
  'nodejs.memory.arrayBuffers.bytes': 2_000_000,
};

export const OTEL_JAVA_HEAP_METRICS: Record<string, unknown> = {
  'jvm.cpu.recent_utilization': 0.3,
  'jvm.system.cpu.utilization': 0.5,
  'jvm.memory.committed': 400_000_000,
  'jvm.memory.limit': 512_000_000,
  'jvm.memory.used': 300_000_000,
  'jvm.thread.count': 42,
  'labels.jvm_memory_pool_name': 'G1 Old Gen',
  'labels.jvm_memory_type': 'heap',
};

export const OTEL_JAVA_NON_HEAP_METRICS: Record<string, unknown> = {
  'jvm.cpu.recent_utilization': 0.3,
  'jvm.system.cpu.utilization': 0.5,
  'jvm.memory.committed': 120_000_000,
  'jvm.memory.limit': 256_000_000,
  'jvm.memory.used': 100_000_000,
  'jvm.thread.count': 42,
  'labels.jvm_memory_pool_name': 'Metaspace',
  'labels.jvm_memory_type': 'non_heap',
};

export const OTEL_NODEJS_METRICS: Record<string, unknown> = {
  'nodejs.eventloop.delay.p50': 1.2,
  'nodejs.eventloop.delay.p90': 3.5,
  'nodejs.eventloop.utilization': 0.15,
  'process.cpu.utilization': 0.25,
  'process.memory.usage': 100_000_000,
};

export const OTEL_DOTNET_METRICS: Record<string, unknown> = {
  'process.memory.usage': 150_000_000,
  'process.runtime.dotnet.gc.collections.count': 25,
  'process.runtime.dotnet.gc.heap.size': 80_000_000,
  'process.runtime.dotnet.thread_pool.threads.count': 10,
};

export const OTEL_NATIVE_EDOT_JAVA_METRICS: Record<string, unknown> = {
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

export const OTEL_NATIVE_OTHER_JAVA_METRICS: Record<string, unknown> = {
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

export const OTEL_PYTHON_METRICS: Record<string, unknown> = {
  'cpython.gc.collected_objects': 500,
  'cpython.gc.collections': 20,
  'cpython.gc.uncollectable_objects': 0,
  'process.runtime.cpython.memory': 80_000_000,
  // Memory usage panel on otel_native-otel_other-python.json queries the
  // metrics-prefixed variant of the same field, so we seed both.
  'metrics.process.runtime.cpython.memory': 80_000_000,
};

export const OTEL_GO_METRICS: Record<string, unknown> = {
  'go.goroutine.count': 50,
  'go.memory.allocated': 30_000_000,
  'go.memory.allocations': 100_000,
  'go.memory.gc.goal': 60_000_000,
  'go.memory.used': 45_000_000,
  'go.processor.limit': 8,
};

export const RUBY_JRUBY_METRICS: Record<string, unknown> = {
  ...SYSTEM_METRICS,
  'jvm.memory.heap.used': 200_000_000,
  'jvm.memory.heap.max': 512_000_000,
  'jvm.memory.non_heap.used': 80_000_000,
  'jvm.thread.count': 30,
  'jvm.gc.time': 100,
  'jvm.gc.count': 5,
};

/**
 * Dashboard-catalog service configs: one per metrics dashboard type.
 * Used by both the CLI synthtrace scenario and the Scout test fixtures.
 */
export const APM_METRICS_DASHBOARD_SERVICES: ApmMetricsServiceConfig[] = [
  // --- classic_apm (no telemetry.sdk.* fields) ---
  {
    name: APM_METRICS_SERVICE_NAMES.JAVA_APM,
    agentName: 'java',
    extraMetrics: JAVA_APM_METRICS,
  },
  {
    name: APM_METRICS_SERVICE_NAMES.NODEJS_APM,
    agentName: 'nodejs',
    extraMetrics: NODEJS_APM_METRICS,
  },

  // --- classic_apm + edot ---
  {
    name: APM_METRICS_SERVICE_NAMES.EDOT_JAVA,
    agentName: 'opentelemetry/java/elastic',
    extraMetrics: [OTEL_JAVA_HEAP_METRICS, OTEL_JAVA_NON_HEAP_METRICS],
  },
  {
    name: APM_METRICS_SERVICE_NAMES.EDOT_NODEJS,
    agentName: 'opentelemetry/nodejs/elastic',
    extraMetrics: OTEL_NODEJS_METRICS,
  },
  {
    name: APM_METRICS_SERVICE_NAMES.EDOT_DOTNET_V9,
    agentName: 'opentelemetry/dotnet/elastic',
    runtimeVersion: '9.0.0',
    extraMetrics: OTEL_DOTNET_METRICS,
  },
  {
    name: APM_METRICS_SERVICE_NAMES.EDOT_DOTNET_V8,
    agentName: 'opentelemetry/dotnet/elastic',
    runtimeVersion: '8.0.11',
    extraMetrics: OTEL_DOTNET_METRICS,
  },

  // --- classic_apm + otel_other ---
  {
    name: APM_METRICS_SERVICE_NAMES.OTEL_JAVA,
    agentName: 'opentelemetry/java',
    extraMetrics: [OTEL_JAVA_HEAP_METRICS, OTEL_JAVA_NON_HEAP_METRICS],
  },
  {
    name: APM_METRICS_SERVICE_NAMES.OTEL_NODEJS,
    agentName: 'opentelemetry/nodejs',
    extraMetrics: OTEL_NODEJS_METRICS,
  },
  {
    name: APM_METRICS_SERVICE_NAMES.OTEL_DOTNET,
    agentName: 'opentelemetry/dotnet',
    extraMetrics: OTEL_DOTNET_METRICS,
  },
  {
    name: APM_METRICS_SERVICE_NAMES.OTEL_GO,
    agentName: 'opentelemetry/go',
    extraMetrics: OTEL_GO_METRICS,
  },

  // --- otel_native + edot (telemetry.sdk.name = opentelemetry) ---
  {
    name: APM_METRICS_SERVICE_NAMES.OTEL_NATIVE_EDOT_JAVA,
    agentName: 'opentelemetry/java/elastic',
    telemetrySdkName: 'opentelemetry',
    telemetrySdkLanguage: 'java',
    extraMetrics: OTEL_NATIVE_EDOT_JAVA_METRICS,
  },
  {
    name: APM_METRICS_SERVICE_NAMES.OTEL_NATIVE_EDOT_NODEJS,
    agentName: 'opentelemetry/nodejs/elastic',
    telemetrySdkName: 'opentelemetry',
    telemetrySdkLanguage: 'nodejs',
    extraMetrics: OTEL_NODEJS_METRICS,
  },
  {
    name: APM_METRICS_SERVICE_NAMES.OTEL_NATIVE_EDOT_PYTHON,
    agentName: 'opentelemetry/python/elastic',
    telemetrySdkName: 'opentelemetry',
    telemetrySdkLanguage: 'python',
    extraMetrics: OTEL_PYTHON_METRICS,
  },

  // --- otel_native + otel_other ---
  {
    name: APM_METRICS_SERVICE_NAMES.OTEL_NATIVE_OTEL_JAVA,
    agentName: 'opentelemetry/java',
    telemetrySdkName: 'opentelemetry',
    telemetrySdkLanguage: 'java',
    extraMetrics: OTEL_NATIVE_OTHER_JAVA_METRICS,
  },
  {
    name: APM_METRICS_SERVICE_NAMES.OTEL_NATIVE_OTEL_NODEJS,
    agentName: 'opentelemetry/nodejs',
    telemetrySdkName: 'opentelemetry',
    telemetrySdkLanguage: 'nodejs',
    extraMetrics: OTEL_NODEJS_METRICS,
  },
  {
    name: APM_METRICS_SERVICE_NAMES.OTEL_NATIVE_OTEL_PYTHON,
    agentName: 'opentelemetry/python',
    telemetrySdkName: 'opentelemetry',
    telemetrySdkLanguage: 'python',
    extraMetrics: OTEL_PYTHON_METRICS,
  },
  {
    name: APM_METRICS_SERVICE_NAMES.OTEL_NATIVE_OTEL_GO,
    agentName: 'opentelemetry/go',
    telemetrySdkName: 'opentelemetry',
    telemetrySdkLanguage: 'go',
    extraMetrics: OTEL_GO_METRICS,
  },
];

/**
 * Non-dashboard service configs: services that exercise code paths
 * outside the dashboard catalog (JRuby JVM, Go classic, Ruby classic).
 */
export const APM_METRICS_NON_DASHBOARD_SERVICES: ApmMetricsServiceConfig[] = [
  {
    name: APM_METRICS_SERVICE_NAMES.RUBY_JRUBY,
    agentName: 'ruby',
    runtimeName: 'jruby',
    extraMetrics: RUBY_JRUBY_METRICS,
  },
  {
    name: APM_METRICS_SERVICE_NAMES.GO_CLASSIC,
    agentName: 'go',
    extraMetrics: SYSTEM_METRICS,
  },
  {
    name: APM_METRICS_SERVICE_NAMES.RUBY_CLASSIC,
    agentName: 'ruby',
    extraMetrics: SYSTEM_METRICS,
  },
];

/**
 * All APM metrics services (dashboard + non-dashboard).
 */
export const APM_METRICS_ALL_SERVICES: ApmMetricsServiceConfig[] = [
  ...APM_METRICS_DASHBOARD_SERVICES,
  ...APM_METRICS_NON_DASHBOARD_SERVICES,
];

export interface ApmMetricsServiceInstance {
  instance: Instance;
  config: ApmMetricsServiceConfig;
}

/**
 * Creates an APM service instance from a config entry, applying optional
 * runtime/SDK fields to the instance. Shared between the CLI scenario and
 * the Scout test fixture so both stay in sync.
 */
export const createMetricsServiceInstance = (
  config: ApmMetricsServiceConfig,
  environment: string
): ApmMetricsServiceInstance => {
  const instance = apm
    .service({ name: config.name, environment, agentName: config.agentName })
    .instance(`${config.name}-instance`);

  // `service.runtime.*` are part of `ApmFields`. `telemetry.sdk.*` are OTel
  // additions not yet declared on `ApmFields`, so we widen the overrides
  // map at this single boundary instead of mutating `instance.fields` via
  // an `as Record<string, unknown>` cast.
  const overrides: Record<string, string> = {};
  if (config.runtimeVersion) overrides['service.runtime.version'] = config.runtimeVersion;
  if (config.runtimeName) overrides['service.runtime.name'] = config.runtimeName;
  if (config.telemetrySdkName) overrides['telemetry.sdk.name'] = config.telemetrySdkName;
  if (config.telemetrySdkLanguage)
    overrides['telemetry.sdk.language'] = config.telemetrySdkLanguage;
  instance.overrides(overrides as Partial<ApmFields>);

  return { instance, config };
};

const extraMetricFieldSets = (
  extraMetrics: ApmMetricsServiceConfig['extraMetrics']
): Array<Record<string, unknown>> => {
  if (!extraMetrics) return [{}];
  return Array.isArray(extraMetrics) ? extraMetrics : [extraMetrics];
};

/**
 * Generates app-metric documents for a single timestamp. Each metricset is
 * built on top of `SYSTEM_METRICS` (the host/process baseline) and merged
 * with the corresponding entry from `config.extraMetrics`; if `extraMetrics`
 * is an array, one metricset is emitted per entry.
 */
export const generateAppMetrics = (
  instance: Instance,
  config: ApmMetricsServiceConfig,
  timestamp: number
) =>
  extraMetricFieldSets(config.extraMetrics).map((extraFields) =>
    instance.appMetrics({ ...SYSTEM_METRICS, ...extraFields }).timestamp(timestamp)
  );
