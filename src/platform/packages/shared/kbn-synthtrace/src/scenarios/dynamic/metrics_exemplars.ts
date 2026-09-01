/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Ingests a correlated metric series plus its exemplars, so the Metrics Experience
 * exemplars POC can fetch real exemplars from Elasticsearch and overlay them on a
 * real chart.
 *
 * It creates three things over [from, to]:
 * - A TSDB metric data stream `metrics-exemplarspoc.default` with a gauge metric
 *   (default `http.server.request.duration`) on `service.name: checkout-service`,
 *   so `TS metrics-*` charts it in Metrics Experience.
 * - One document per exemplar in `metrics.exemplars-*`, in OTel or Prometheus
 *   shape (per the "Exemplar support in ES" proposal), carrying the same metric
 *   name so the exemplar fetch correlates by metric.
 * - One APM transaction per exemplar that carries a trace id, sharing the same
 *   trace.id / span.id, so clicking the exemplar opens a real trace in the
 *   waterfall flyout (the `GET /internal/apm/unified_traces` API finds it).
 *
 * Trace/span ids are top-level for OTel and nested under `exemplar_labels` for
 * Prometheus. A fraction of exemplars omit trace ids (trace.id is optional); those
 * exemplars are not clickable and get no matching APM trace.
 *
 * Related:
 * - PR: https://github.com/elastic/kibana/pull/285618 (review: ingest instead of mock)
 * - Spike: https://github.com/elastic/observability-dev/issues/5961
 * - Productionization: https://github.com/elastic/kibana/issues/273398
 *
 * Scenario options (via --scenarioOpts):
 * - format ('otel' | 'prometheus', default 'otel')
 * - count (number, default 40): number of exemplar docs to ingest
 * - metricName (string, default per format): metric value field name
 * - withTraceRatio (number 0..1, default 0.8): fraction of exemplars carrying a trace id
 *
 * Run:
 *   node scripts/synthtrace dynamic/metrics_exemplars --from now-1h --to now \
 *     --scenarioOpts='{"format":"otel","count":40}'
 *   node scripts/synthtrace dynamic/metrics_exemplars --from now-1h --to now \
 *     --scenarioOpts='{"format":"prometheus"}'
 *
 * Validate (Kibana Dev Tools ES|QL):
 *   TS metrics-exemplarspoc.default | METRICS_INFO
 *   FROM metrics.exemplars-* | KEEP @timestamp, trace_id, span_id, metrics.* | LIMIT 20
 *   FROM traces-apm* | WHERE service.name == "checkout-service" | KEEP trace.id, transaction.id | LIMIT 20
 *
 * Cleanup: delete the `metrics-exemplarspoc.default` data stream, the
 * `metrics.exemplars-*` indices, and the `checkout-service` APM traces, or filter
 * on `attributes.synthtrace.scenario` (OTel) / `exemplar_labels.synthtrace_scenario`
 * (Prometheus) / `service.environment` (APM traces).
 */

import type { Client } from '@elastic/elasticsearch';
import { apm, type ApmFields, type SynthtraceGenerator } from '@kbn/synthtrace-client';
import type { Scenario } from '../../cli/scenario';
import { getSynthtraceEnvironment } from '../../lib/utils/get_synthtrace_environment';

const ENVIRONMENT = getSynthtraceEnvironment(__filename);

const SERVICE_NAME = 'checkout-service';
const HOST_NAME = 'checkout-7d9f5';
const ROUTE = '/checkout';

type ExemplarFormat = 'otel' | 'prometheus';

const DEFAULT_SCENARIO_OPTS = {
  format: 'otel' as ExemplarFormat,
  count: 40,
  metricName: '',
  withTraceRatio: 0.8,
};

type ScenarioOpts = typeof DEFAULT_SCENARIO_OPTS;

const OTEL_INDEX = 'metrics.exemplars-generic.otel-default';
const PROMETHEUS_INDEX = 'metrics.exemplars-generic.prometheus-default';
const DEFAULT_OTEL_METRIC = 'http.server.request.duration';
const DEFAULT_PROMETHEUS_METRIC = 'http_request_duration_seconds';

// TSDB metric data stream (matches `metrics-*`, so Metrics Experience charts it).
const METRIC_TEMPLATE_NAME = 'metrics-exemplarspoc';
const METRIC_DATA_STREAM = 'metrics-exemplarspoc.default';

const HEX_CHARS = '0123456789abcdef';

const randomHex = (length: number): string =>
  Array.from({ length }, () => HEX_CHARS[Math.floor(Math.random() * HEX_CHARS.length)]).join('');

const randomValue = (): number => Number((0.1 + Math.random() * 1.4).toFixed(3));

function assertNoUnknownScenarioOpts(opts: Record<string, unknown>) {
  const unknown = Object.keys(opts).filter((key) => !(key in DEFAULT_SCENARIO_OPTS));
  if (unknown.length) {
    throw new Error(`Unknown scenarioOpts: ${unknown.join(', ')}`);
  }
}

function resolveMetricName(opts: ScenarioOpts): string {
  return (
    opts.metricName ||
    (opts.format === 'prometheus' ? DEFAULT_PROMETHEUS_METRIC : DEFAULT_OTEL_METRIC)
  );
}

interface ExemplarInput {
  timestamp: number;
  value: number;
  traceId?: string;
  spanId?: string;
  metricName: string;
}

function buildOtelDoc({ timestamp, value, traceId, spanId, metricName }: ExemplarInput) {
  const doc: Record<string, unknown> = {
    '@timestamp': new Date(timestamp).toISOString(),
    resource: { attributes: { 'service.name': SERVICE_NAME, 'host.name': HOST_NAME } },
    scope: { name: 'io.opentelemetry.http' },
    attributes: {
      'http.request.method': 'GET',
      'http.route': ROUTE,
      'synthtrace.scenario': ENVIRONMENT,
    },
    unit: 's',
    temporality: 'cumulative',
    filtered_attributes: { 'thread.id': 42 },
    metrics: { [metricName]: value },
  };
  if (traceId) {
    doc.trace_id = traceId;
    doc.span_id = spanId;
  }
  return doc;
}

function buildPrometheusDoc({ timestamp, value, traceId, spanId, metricName }: ExemplarInput) {
  const exemplarLabels: Record<string, string> = {
    thread_id: '42',
    synthtrace_scenario: ENVIRONMENT,
  };
  if (traceId && spanId) {
    exemplarLabels.trace_id = traceId;
    exemplarLabels.span_id = spanId;
  }
  return {
    '@timestamp': new Date(timestamp).toISOString(),
    labels: {
      __name__: metricName,
      job: SERVICE_NAME,
      instance: `${HOST_NAME}:9464`,
      method: 'GET',
      route: ROUTE,
    },
    exemplar_labels: exemplarLabels,
    metrics: { [metricName]: value },
  };
}

async function ensureMetricDataStream(esClient: Client): Promise<void> {
  // Any double metric field is mapped as a gauge, so the dynamic metric name works
  // without knowing it upfront; service.name and http.route are the dimensions.
  await esClient.indices.putIndexTemplate({
    name: METRIC_TEMPLATE_NAME,
    index_patterns: [`${METRIC_TEMPLATE_NAME}.*`],
    data_stream: {},
    priority: 500,
    template: {
      settings: { index: { mode: 'time_series', number_of_replicas: 0 } },
      mappings: {
        dynamic_templates: [
          {
            metrics_as_gauge: {
              match_mapping_type: 'double',
              mapping: { type: 'double', time_series_metric: 'gauge' },
            },
          },
        ],
        properties: {
          '@timestamp': { type: 'date' },
          service: { properties: { name: { type: 'keyword', time_series_dimension: true } } },
          http: { properties: { route: { type: 'keyword', time_series_dimension: true } } },
        },
      },
    },
  });
}

async function indexMetricSeries({
  esClient,
  from,
  to,
  metricName,
}: {
  esClient: Client;
  from: number;
  to: number;
  metricName: string;
}): Promise<number> {
  const operations: object[] = [];
  for (let timestamp = from; timestamp <= to; timestamp += 60_000) {
    operations.push({ create: { _index: METRIC_DATA_STREAM } });
    operations.push({
      '@timestamp': new Date(timestamp).toISOString(),
      'service.name': SERVICE_NAME,
      'http.route': ROUTE,
      [metricName]: Number((0.2 + Math.random() * 0.6).toFixed(3)),
    });
  }
  await esClient.bulk({ operations, refresh: true });
  return operations.length / 2;
}

// Builds the shared exemplar pool once so the exemplar docs (indexed in bootstrap)
// and the matching APM traces (generated later) reference the same trace/span ids.
function buildExemplarInputs({
  from,
  to,
  opts,
  metricName,
}: {
  from: number;
  to: number;
  opts: ScenarioOpts;
  metricName: string;
}): ExemplarInput[] {
  const count = Math.max(1, opts.count);
  const span = to - from;

  return Array.from({ length: count }, (_, i) => {
    // Spread evenly across the range; timestamps are not guaranteed unique, which
    // is realistic (two threads can report an exemplar at the same time).
    const ratio = count === 1 ? 0 : i / (count - 1);
    const timestamp = Math.round(from + ratio * span);
    const hasTrace = Math.random() < opts.withTraceRatio;
    return {
      timestamp,
      value: randomValue(),
      metricName,
      traceId: hasTrace ? randomHex(32) : undefined,
      spanId: hasTrace ? randomHex(16) : undefined,
    };
  });
}

async function indexExemplars({
  esClient,
  inputs,
  opts,
}: {
  esClient: Client;
  inputs: ExemplarInput[];
  opts: ScenarioOpts;
}): Promise<{ index: string; count: number }> {
  const isPrometheus = opts.format === 'prometheus';
  const index = isPrometheus ? PROMETHEUS_INDEX : OTEL_INDEX;

  const docs = inputs.map((input) =>
    isPrometheus ? buildPrometheusDoc(input) : buildOtelDoc(input)
  );

  const operations = docs.flatMap((doc) => [{ index: { _index: index } }, doc]);
  await esClient.bulk({ operations, refresh: true });

  return { index, count: docs.length };
}

// Emits one APM transaction per exemplar that carries a trace id, forcing the
// exemplar's trace/span ids onto the transaction. `.defaults()` cannot override
// the ids the Transaction constructor already sets, so we assign fields directly.
function* generateTraces(inputs: ExemplarInput[]): SynthtraceGenerator<ApmFields> {
  const instance = apm
    .service({ name: SERVICE_NAME, environment: ENVIRONMENT, agentName: 'nodejs' })
    .instance(HOST_NAME);

  for (const input of inputs) {
    if (!input.traceId || !input.spanId) {
      continue;
    }
    const transaction = instance
      .transaction({ transactionName: `GET ${ROUTE}` })
      .timestamp(input.timestamp)
      .duration(Math.max(1, Math.round(input.value * 1000)))
      .success();

    transaction.fields['trace.id'] = input.traceId;
    transaction.fields['transaction.id'] = input.spanId;
    transaction.fields['span.id'] = input.spanId;

    yield transaction;
  }
}

const scenario: Scenario<ApmFields> = async (runOptions) => {
  const { from, to, logger } = runOptions;
  const scenarioOpts = (runOptions.scenarioOpts ?? {}) as Record<string, unknown>;
  assertNoUnknownScenarioOpts(scenarioOpts);
  const opts = { ...DEFAULT_SCENARIO_OPTS, ...scenarioOpts } as ScenarioOpts;
  const metricName = resolveMetricName(opts);

  // Shared pool: exemplar docs (bootstrap) and APM traces (generate) reuse the
  // same trace/span ids, so clicking an exemplar resolves to a real trace.
  const exemplarInputs = buildExemplarInputs({ from, to, opts, metricName });

  return {
    // Everything is indexed here (not in `generate`) because synthtrace runs
    // `generate` in workers over sub-ranges, each re-instantiating the scenario
    // with a fresh random pool. Indexing in `bootstrap` keeps the exemplar docs
    // and their matching APM traces on a single shared id pool.
    bootstrap: async (synthtraceClients, _kibanaClient, esClient) => {
      await ensureMetricDataStream(esClient);
      const metricCount = await indexMetricSeries({ esClient, from, to, metricName });
      logger.info(
        `Indexed ${metricCount} metric points into ${METRIC_DATA_STREAM} (metric: ${metricName})`
      );

      const { index, count } = await indexExemplars({ esClient, inputs: exemplarInputs, opts });
      logger.info(
        `Indexed ${count} ${opts.format} exemplars into ${index} (metric: ${metricName}, env: ${ENVIRONMENT})`
      );

      const tracedCount = exemplarInputs.filter((input) => input.traceId).length;
      await synthtraceClients.apmEsClient.index(generateTraces(exemplarInputs));
      await synthtraceClients.apmEsClient.refresh();
      logger.info(
        `Indexed ${tracedCount} APM traces for exemplars on ${SERVICE_NAME} (env: ${ENVIRONMENT})`
      );
    },
    generate: () => [],
  };
};

export default scenario;
