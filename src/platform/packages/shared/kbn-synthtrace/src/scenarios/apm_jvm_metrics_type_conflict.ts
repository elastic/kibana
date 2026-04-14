/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Reproduces `verification_exception` errors on the APM Metrics tab when both
 * classic (Elastic APM) and OTel Java agents ingest data for the same service.
 *
 *
 * Root cause: `convertSavedDashboardToPanels` in helper.ts never receives
 * `apmIndices`, so {{indexPattern}} resolves to the full APM data view
 * (traces + logs + metrics, classic + OTel). ES|QL FROM across indices with
 * conflicting JVM metric field types produces `verification_exception`.
 *
 * The type conflict arises because the same field names (jvm.cpu.recent_utilization,
 * jvm.memory.used, jvm.thread.count) exist as plain numerics in the classic index
 * and as TSDB gauge metrics in the OTel index. ES|QL cannot reconcile these and
 * reports them as `type [unsupported]`.
 *
 * What this generates:
 * 1. OTel Java traces via the OTel pipeline (so APM UI detects OTel → selects
 *    the otel_native-edot-java dashboard with ES|QL queries)
 * 2. Classic APM Java JVM metrics via direct bulk indexing (metrics-apm.internal-*)
 *    - Fields: jvm.memory.heap.used, jvm.thread.count, system.process.cpu.*
 * 3. OTel stable-semconv JVM metrics via direct bulk indexing (metrics-jvm_synth.otel-*)
 *    - Fields: jvm.memory.used, jvm.cpu.recent_utilization, jvm.thread.count
 *
 * The OTel metrics index is configured as TSDB with gauge annotations on JVM
 * fields. ES|QL FROM cannot read TSDB gauge types and reports them as
 * `type [unsupported]`, producing the exact `verification_exception` the
 * customer sees on serverless.
 *
 * Run:
 *   node scripts/synthtrace apm_jvm_metrics_type_conflict --clean
 *
 * Scenario options:
 * - serviceName (string, default: "kms-gps-synth"): OTel service name
 * - classicServiceName (string, default: "kms-gps-classic"): classic APM service
 * - rpm (number, default: 2): OTel traces per minute
 *
 */

import type { ApmOtelFields } from '@kbn/synthtrace-client';
import { apm, ApmSynthtracePipelineSchema } from '@kbn/synthtrace-client';
import type { Client } from '@elastic/elasticsearch';
import type { IndicesPutIndexTemplateRequest } from '@elastic/elasticsearch/lib/api/types';
import type { Scenario } from '../cli/scenario';
import { withClient } from '../lib/utils/with_client';
import { getSynthtraceEnvironment } from '../lib/utils/get_synthtrace_environment';

const ENVIRONMENT = getSynthtraceEnvironment(__filename);

const DEFAULT_SCENARIO_OPTS = {
  serviceName: 'kms-gps-synth',
  classicServiceName: 'kms-gps-classic',
  rpm: 2,
};

function assertNoUnknownScenarioOpts(opts: Record<string, unknown>) {
  const unknown = Object.keys(opts).filter((k) => !(k in DEFAULT_SCENARIO_OPTS));
  if (unknown.length) {
    throw new Error(`Unknown scenarioOpts: ${unknown.join(', ')}`);
  }
}

function generateClassicApmJvmDocs(
  serviceName: string,
  startMs: number,
  endMs: number
): Array<{ index: string; doc: Record<string, unknown> }> {
  const docs: Array<{ index: string; doc: Record<string, unknown> }> = [];
  const intervalMs = 60_000;

  for (let ts = startMs; ts <= endMs; ts += intervalMs) {
    const timestamp = new Date(ts).toISOString();

    docs.push({
      index: `metrics-apm.internal-default`,
      doc: {
        '@timestamp': timestamp,
        'processor.event': 'metric',
        'metricset.name': 'jvm',
        'service.name': serviceName,
        'service.environment': ENVIRONMENT,
        'service.node.name': `${serviceName}-instance-1`,
        'host.name': `${serviceName}-host-01`,
        'agent.name': 'java',
        'agent.version': '1.50.0',
        'system.process.cpu.total.norm.pct': 0.75 + Math.random() * 0.1,
        'jvm.memory.heap.used': 500_000_000 + Math.floor(Math.random() * 100_000_000),
        'jvm.memory.heap.max': 1_073_741_824,
        'jvm.memory.non_heap.used': 50_000_000 + Math.floor(Math.random() * 10_000_000),
        'jvm.memory.non_heap.max': 268_435_456,
        'jvm.thread.count': 42 + Math.floor(Math.random() * 8),
        'jvm.thread.daemon': true,
        'jvm.thread.state': 'runnable',
        'jvm.gc.time': 100 + Math.floor(Math.random() * 100),
        'jvm.memory.pool.name': 'G1 Old Gen',
        'jvm.memory.committed': 600_000_000 + Math.floor(Math.random() * 50_000_000),
        'jvm.memory.used_after_last_gc': 200_000_000 + Math.floor(Math.random() * 50_000_000),
        'jvm.system.cpu.utilization': 0.3 + Math.random() * 0.2,
        'jvm.class.count': 8000 + Math.floor(Math.random() * 500),
        // OTel-named fields as plain numerics — creates type conflict with
        // TSDB gauge versions in the OTel index, causing ES|QL unsupported type
        'jvm.cpu.recent_utilization': 0.75 + Math.random() * 0.1,
        'jvm.memory.used': 500_000_000 + Math.floor(Math.random() * 100_000_000),
        'jvm.memory.limit': 1_073_741_824,
        'jvm.gc.duration': 0.05 + Math.random() * 0.05,
      },
    });

    docs.push({
      index: `metrics-apm.internal-default`,
      doc: {
        '@timestamp': timestamp,
        'processor.event': 'transaction',
        'transaction.name': 'GET /api/location',
        'transaction.type': 'request',
        'transaction.result': 'HTTP 2xx',
        'transaction.duration.us': 200_000 + Math.floor(Math.random() * 100_000),
        'event.outcome': 'success',
        'service.name': serviceName,
        'service.environment': ENVIRONMENT,
        'service.node.name': `${serviceName}-instance-1`,
        'host.name': `${serviceName}-host-01`,
        'agent.name': 'java',
        'agent.version': '1.50.0',
      },
    });
  }

  return docs;
}

const OTEL_INDEX = 'metrics-jvm_synth.otel-default';
const OTEL_TEMPLATE_NAME = 'metrics-jvm_synth.otel';

function generateOtelJvmMetricsDocs(
  serviceName: string,
  startMs: number,
  endMs: number
): Array<{ index: string; doc: Record<string, unknown> }> {
  const docs: Array<{ index: string; doc: Record<string, unknown> }> = [];
  const intervalMs = 60_000;
  for (let ts = startMs; ts <= endMs; ts += intervalMs) {
    const timestamp = new Date(ts).toISOString();

    docs.push({
      index: OTEL_INDEX,
      doc: {
        '@timestamp': timestamp,
        'processor.event': 'metric',
        'metricset.name': 'app',
        'service.name': serviceName,
        'service.environment': ENVIRONMENT,
        'service.node.name': `${serviceName}-otel-instance`,
        'host.name': `${serviceName}-otel-host`,
        'agent.name': 'opentelemetry/java/elastic',
        'telemetry.sdk.name': 'opentelemetry',
        'telemetry.sdk.language': 'java',
        'jvm.cpu.recent_utilization': 0.65 + Math.random() * 0.15,
        'jvm.memory.used': 400_000_000 + Math.floor(Math.random() * 100_000_000),
        'jvm.memory.limit': 800_000_000,
        'jvm.memory.type': 'heap',
        'jvm.memory.pool.name': 'G1 Old Gen',
        'jvm.memory.committed': 500_000_000 + Math.floor(Math.random() * 50_000_000),
        'jvm.memory.used_after_last_gc': 150_000_000 + Math.floor(Math.random() * 40_000_000),
        'jvm.system.cpu.utilization': 0.25 + Math.random() * 0.15,
        'jvm.class.count': 7500 + Math.floor(Math.random() * 500),
        'jvm.thread.count': 35 + Math.floor(Math.random() * 10),
        'jvm.thread.daemon': true,
        'jvm.thread.state': 'runnable',
        'jvm.gc.duration': 0.1 + Math.random() * 0.1,
      },
    });

    docs.push({
      index: OTEL_INDEX,
      doc: {
        '@timestamp': timestamp,
        'processor.event': 'metric',
        'metricset.name': 'app',
        'service.name': serviceName,
        'service.environment': ENVIRONMENT,
        'service.node.name': `${serviceName}-otel-instance`,
        'host.name': `${serviceName}-otel-host`,
        'agent.name': 'opentelemetry/java/elastic',
        'telemetry.sdk.name': 'opentelemetry',
        'telemetry.sdk.language': 'java',
        'jvm.memory.used': 50_000_000 + Math.floor(Math.random() * 10_000_000),
        'jvm.memory.limit': 128_000_000,
        'jvm.memory.type': 'non_heap',
      },
    });
  }

  return docs;
}

async function ensureTsdbTemplate(esClient: Client) {
  await esClient.indices.putIndexTemplate({
    name: OTEL_TEMPLATE_NAME,
    index_patterns: ['metrics-jvm_synth.otel-*'],
    data_stream: {},
    priority: 500,
    template: {
      settings: {
        'index.mode': 'time_series',
        'index.routing_path': ['service.name', 'service.node.name', 'jvm.memory.type'],
      },
      mappings: {
        properties: {
          '@timestamp': { type: 'date' },
          'service.name': { type: 'keyword', time_series_dimension: true },
          'service.environment': { type: 'keyword' },
          'service.node.name': { type: 'keyword', time_series_dimension: true },
          'host.name': { type: 'keyword' },
          'agent.name': { type: 'keyword' },
          'telemetry.sdk.name': { type: 'keyword' },
          'telemetry.sdk.language': { type: 'keyword' },
          'processor.event': { type: 'keyword' },
          'metricset.name': { type: 'keyword' },
          'jvm.memory.type': { type: 'keyword', time_series_dimension: true },
          'jvm.memory.pool.name': { type: 'keyword' },
          'jvm.thread.daemon': { type: 'boolean' },
          'jvm.thread.state': { type: 'keyword' },
          'jvm.cpu.recent_utilization': {
            type: 'double',
            time_series_metric: 'gauge',
          },
          'jvm.memory.used': {
            type: 'long',
            time_series_metric: 'gauge',
          },
          'jvm.memory.limit': {
            type: 'long',
            time_series_metric: 'gauge',
          },
          'jvm.thread.count': {
            type: 'integer',
            time_series_metric: 'gauge',
          },
          'jvm.gc.duration': {
            type: 'double',
            time_series_metric: 'gauge',
          },
          'jvm.memory.committed': {
            type: 'long',
            time_series_metric: 'gauge',
          },
          'jvm.system.cpu.utilization': {
            type: 'double',
            time_series_metric: 'gauge',
          },
          'jvm.class.count': {
            type: 'integer',
            time_series_metric: 'gauge',
          },
          'jvm.memory.used_after_last_gc': {
            type: 'long',
            time_series_metric: 'gauge',
          },
        },
      },
    },
  } as unknown as IndicesPutIndexTemplateRequest);
}

async function cleanupTsdbTemplate(esClient: Client) {
  await esClient.indices.deleteIndexTemplate({ name: OTEL_TEMPLATE_NAME }).catch(() => {});
}

async function bulkIndexDocs(
  esClient: Client,
  docs: Array<{ index: string; doc: Record<string, unknown> }>
) {
  if (docs.length === 0) return;

  const batchSize = 2000;
  for (let i = 0; i < docs.length; i += batchSize) {
    const batch = docs.slice(i, i + batchSize);
    const body = batch.flatMap(({ index, doc }) => [{ create: { _index: index } }, doc]);
    await esClient.bulk({ body, refresh: false });
  }
}

const scenario: Scenario<ApmOtelFields> = async ({ from, to, logger, ...runOptions }) => {
  const scenarioOpts = (runOptions.scenarioOpts ?? {}) as Record<string, unknown>;
  assertNoUnknownScenarioOpts(scenarioOpts);
  const opts = { ...DEFAULT_SCENARIO_OPTS, ...scenarioOpts } as typeof DEFAULT_SCENARIO_OPTS;
  const { serviceName, classicServiceName, rpm } = opts;

  return {
    bootstrap: async (_synthtraceClients, _kibanaClient, esClient) => {
      logger.info(`Indexing classic APM JVM metrics for "${classicServiceName}" (direct bulk)...`);
      const classicDocs = generateClassicApmJvmDocs(classicServiceName, from, to);
      await bulkIndexDocs(esClient, classicDocs);
      logger.info(`Indexed ${classicDocs.length} classic APM docs`);

      logger.info('Creating TSDB index template for OTel JVM metrics...');
      await cleanupTsdbTemplate(esClient);
      await ensureTsdbTemplate(esClient);

      logger.info(`Indexing OTel JVM metrics for "${serviceName}" (direct bulk, TSDB gauge)...`);
      const otelDocs = generateOtelJvmMetricsDocs(serviceName, from, to);
      await bulkIndexDocs(esClient, otelDocs);
      logger.info(`Indexed ${otelDocs.length} OTel JVM metric docs`);

      await esClient.indices.refresh({
        index: `metrics-apm.internal-default,${OTEL_INDEX}`,
      });
    },

    generate: ({ range, clients: { apmEsClient } }) => {
      const otelInstance = apm
        .otelService({
          name: serviceName,
          namespace: ENVIRONMENT,
          sdkLanguage: 'java',
          sdkName: 'opentelemetry',
          distro: 'elastic',
        })
        .instance(`${serviceName}-otel-instance`);

      const otelTraces = range.ratePerMinute(rpm).generator((timestamp) =>
        otelInstance
          .span({ name: 'GET /api/location', kind: 'Server' })
          .timestamp(timestamp)
          .duration(200)
          .success()
          .children(
            otelInstance
              .span({ name: 'SELECT * FROM locations', kind: 'Internal' })
              .timestamp(timestamp)
              .duration(100)
              .success()
          )
      );

      return withClient(apmEsClient, otelTraces);
    },

    setupPipeline: ({ apmEsClient }) => {
      apmEsClient.setPipeline(apmEsClient.resolvePipelineType(ApmSynthtracePipelineSchema.Otel));
    },

    // No teardown — data must persist for Kibana UI validation.
    // Re-run with --clean to remove all data.
  };
};

export default scenario;
