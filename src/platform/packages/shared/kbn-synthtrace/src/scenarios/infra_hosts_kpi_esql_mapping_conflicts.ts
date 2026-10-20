/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Goal / Kibana symptom reproduced
 * --------------------------------
 * Reproduces the Infrastructure > Hosts page KPI-tile failures caused by
 * Elasticsearch mapping conflicts (ES|QL "union types") on the metrics index
 * pattern. The four headline tiles (CPU Usage, Normalized Load, Memory Usage,
 * Disk Usage) are filled by ONE ES|QL query, and ES|QL resolves every
 * referenced column up front — so a single conflicting field blanks ALL FOUR
 * tiles, not just the one it belongs to:
 *   x-pack/solutions/observability/plugins/infra/public/pages/metrics/hosts/hooks/use_hosts_kpis_esql.ts
 *
 * Mechanism
 * ---------
 * The Hosts page queries the configured metrics indices (`metrics-*,metricbeat-*`
 * by default). This scenario writes healthy hosts into the usual
 * `metrics-system.*-default` / `metrics-hostmetricsreceiver.otel-default` data
 * streams, then `bootstrap` creates extra indices under `metricbeat-*` that map
 * the SAME KPI fields with a CONFLICTING type. `metricbeat-*` is used
 * deliberately: it is part of the Hosts index pattern, but no synthtrace client
 * writes there, so these indices never collide with synthtrace data streams or
 * with the built-in `metrics-*-*` index templates.
 *
 * Each conflict flavour is applied to a DIFFERENT KPI so per-tile behaviour is
 * observable in one page load. `system.load.*` /
 * `metrics.system.cpu.load_average.1m` are deliberately left clean, so
 * Normalized Load is the control tile that must always render.
 *
 * Conflict flavours (measured ES|QL behaviour, ES 9.x)
 * ---------------------------------------------------
 * | flavour        | KPI      | mapping in metricbeat-* | ES|QL type / suggested_cast          |
 * |----------------|----------|-------------------------|--------------------------------------|
 * | aggMetric      | Memory   | aggregate_metric_double | unsupported / aggregate_metric_double|
 * | mixedNumeric   | CPU      | long (real data: float) | unsupported / keyword                |
 * | keywordMetric  | Disk     | keyword                 | unsupported / keyword                |
 * | hostName       | ALL      | host.name as text       | unsupported / keyword                |
 * | state          | semconv  | state as an object      | unsupported / keyword                |
 *
 * Conflict rows in the table (each appears under BOTH ECS and semconv)
 * -------------------------------------------------------------------
 * The flavours are split across two synthetic hosts so one page load shows
 * which columns a conflict blanks and which it leaves alone. A conflict
 * document only carries the fields its flavour conflicts on, so every other
 * column on that row is legitimately N/A.
 *
 * | host                       | flavours                   | populated columns |
 * |----------------------------|----------------------------|-------------------|
 * | kpi-conflict-cpu-disk-host | mixedNumeric, keywordMetric| CPU only          |
 * | kpi-conflict-memory-host   | aggMetric, state           | Memory only       |
 *
 * Each conflict index holds one document PER SCHEMA, not one shared document:
 * the two schemas read different fields, and every semconv aggregation is
 * scoped by `state` (`idle` for CPU, `used` for memory, `free`/all for disk),
 * so a document without a `state` leaves every semconv column N/A regardless
 * of the values it carries. The per-schema documents therefore populate the
 * same columns under both schemas.
 *
 * Disk stays N/A on the CPU/Disk host under both schemas because the table
 * reads it with `max`/`sum`, neither of which can read a `keyword` — the shard
 * holding it fails and Elasticsearch returns partial results. Only the ES|QL
 * tiles recover it, via `::double`. That difference is the point of the flavour.
 *
 * Note that ES suggests `keyword` for a purely NUMERIC union (e.g. float+long),
 * even though `::double` resolves it — verified against ES:
 *   FROM <numeric union>          | STATS AVG(f)          -> verification_exception
 *   FROM <numeric union>          | STATS AVG(f::double)  -> OK
 *   FROM <agg_metric_double union>| STATS AVG(f::double)  -> verification_exception
 *   FROM <agg_metric_double union>| STATS AVG(f::aggregate_metric_double) -> OK
 * So `::double` is the correct cast for every union EXCEPT one containing
 * `aggregate_metric_double`, which must be cast to `::aggregate_metric_double`.
 * The `original_types` array on each `LIMIT 0` column tells the two apart.
 *
 * Issue
 * -----
 * - https://github.com/elastic/kibana/issues/288596
 *
 * Supported --scenarioOpts (and defaults)
 * ---------------------------------------
 * - numHosts (number, default: 3): healthy hosts generated per schema.
 * - schemas (string, default: 'both'): 'both' | 'ecs' | 'semconv'. Generating
 *   only one schema makes the OTHER schema's fields missing entirely, which is
 *   the "unknown column" class of failure.
 * - conflicts (string, default: 'metrics'): comma-separated list of flavours
 *   from the table above, or the aliases 'none' / 'metrics' / 'all'.
 *     'none'    -> no conflict indices (clean baseline / control run)
 *     'metrics' -> aggMetric,mixedNumeric,keywordMetric (partial failure)
 *     'all'     -> every flavour, including hostName and state (worst case)
 * - omitMetricsets (string, default: ''): comma-separated metricsets to skip
 *   when generating healthy hosts (e.g. 'filesystem'), which removes those
 *   columns from the pattern altogether rather than making them conflict.
 *   Healthy ECS hosts also emit `diskio` so the Hosts Metrics-tab IOPS /
 *   throughput charts have data; pass 'diskio' here to skip them.
 *
 * Run
 * ---
 *   node scripts/synthtrace infra_hosts_kpi_esql_mapping_conflicts \
 *     --from now-1h --to now --target http://localhost:9200
 *
 *   # clean baseline, then the worst case
 *   ... --scenarioOpts='{"conflicts":"none"}'
 *   ... --scenarioOpts='{"conflicts":"all"}'
 *
 * Every run first deletes ALL flavours' indices, so switching `conflicts`
 * between runs never leaves a stale conflict behind. `--clean` only clears the
 * synthtrace data streams, so the simplest way to drop the conflict indices is
 * to re-run with `--scenarioOpts='{"conflicts":"none"}'`.
 *
 * Validation condition (must hold in Elasticsearch)
 * -------------------------------------------------
 * A `FROM metrics-*,metricbeat-* | LIMIT 0` request reports the affected KPI
 * fields with `"type": "unsupported"` plus `original_types`/`suggested_cast`,
 * while `metrics-system.*` alone still reports them numeric.
 *
 * Validate with the schema filter the page actually sends, not a bare query:
 * Elasticsearch skips an index no document of which can match, so a conflict
 * index without a schema marker is skipped and the union type disappears. That
 * is why each conflict index carries one ECS-marked and one semconv-marked
 * document — see `SCHEMA_MARKERS` below.
 *
 *   POST /_query
 *   {
 *     "query": "FROM metrics-*,metricbeat-* | STATS AVG(system.memory.actual.used.pct::double)",
 *     "filter": { "bool": { "filter": [
 *       { "range": { "@timestamp": { "gte": "now-15m", "lte": "now" } } },
 *       { "term": { "event.module": "system" } }
 *     ] } }
 *   }
 *
 * must fail with `verification_exception`.
 */

import type { Client } from '@elastic/elasticsearch';
import type { MappingProperty } from '@elastic/elasticsearch/lib/api/types';
import { infra } from '@kbn/synthtrace-client';
import type { InfraDocument } from '@kbn/synthtrace-client';
import { times } from 'lodash';
import type { Scenario } from '../cli/scenario';
import { getNumberOpt, getStringOpt } from './helpers/scenario_opts_helpers';
import { withClient } from '../lib/utils/with_client';

// Kept in sync with the KPI hook's field constants.
const ECS_CPU_FIELD = 'system.cpu.total.norm.pct';
const ECS_MEMORY_FIELD = 'system.memory.actual.used.pct';
const ECS_DISK_FIELD = 'system.filesystem.used.pct';
const SEMCONV_CPU_FIELD = 'metrics.system.cpu.utilization';
const SEMCONV_MEMORY_FIELD = 'system.memory.utilization';
const SEMCONV_DISK_FIELD = 'metrics.system.filesystem.usage';
const HOST_NAME_FIELD = 'host.name';
const STATE_FIELD = 'state';
const EVENT_MODULE_FIELD = 'event.module';
const DATASTREAM_DATASET_FIELD = 'data_stream.dataset';
const ECS_DISK_USED_PCT = 0.42;

// The KPI query is filtered by the host inventory model's schema `nodeFilter`
// (`event.module: system` for ECS, `data_stream.dataset:
// hostmetricsreceiver.otel` for semconv):
//   x-pack/solutions/observability/plugins/metrics_data_access/common/inventory_models/host/index.ts
// A conflict index whose documents match neither is skipped outright by
// Elasticsearch, so the union type never materialises and the query succeeds.
// Each conflict index therefore gets one document per schema.
const SCHEMA_MARKERS = {
  ecs: { [EVENT_MODULE_FIELD]: 'system' },
  semconv: { [DATASTREAM_DATASET_FIELD]: 'hostmetricsreceiver.otel' },
} as const;

type ConflictSchema = keyof typeof SCHEMA_MARKERS;

// The conflicting flavours are split across two synthetic hosts rather than
// piled onto one, so a single page load shows which columns a given conflict
// blanks and which it leaves alone: the CPU/Disk host reports CPU but not
// memory, the Memory host the reverse. Both appear under ECS and semconv,
// because every conflict index carries one document per schema marker above.
const CONFLICT_HOST_CPU_DISK = 'kpi-conflict-cpu-disk-host';
const CONFLICT_HOST_MEMORY = 'kpi-conflict-memory-host';

const CONFLICT_INDEX_PREFIX = 'metricbeat-kpi-esql-conflicts';

const CONFLICT_NAMES = ['aggMetric', 'mixedNumeric', 'keywordMetric', 'hostName', 'state'] as const;

type ConflictName = (typeof CONFLICT_NAMES)[number];

const CONFLICT_ALIASES: Readonly<Record<string, readonly ConflictName[]>> = {
  none: [],
  metrics: ['aggMetric', 'mixedNumeric', 'keywordMetric'],
  all: CONFLICT_NAMES,
};

const AGGREGATE_METRIC_DOUBLE: MappingProperty = {
  type: 'aggregate_metric_double',
  metrics: ['min', 'max', 'sum', 'value_count'],
  default_metric: 'max',
};

// A downsampled `aggregate_metric_double` value for the fields mapped as such.
const AGGREGATE_METRIC_VALUE = { min: 0.21, max: 0.83, sum: 2.08, value_count: 4 };

const KEYWORD: MappingProperty = { type: 'keyword' };
const DATE: MappingProperty = { type: 'date' };

interface ConflictSpec {
  readonly name: ConflictName;
  // Which tiles this flavour is expected to affect, for the run log.
  readonly affects: string;
  // Table row this flavour's documents land on. Omitted by `hostName`, whose
  // whole point is that its document carries a `text`-mapped `host.name`.
  readonly host?: string;
  // Conflicting properties only; `@timestamp`/`host.name`/`state` are added
  // separately.
  readonly mappings: Readonly<Record<string, MappingProperty>>;
  // One document per schema. The two schemas read different fields, and every
  // semconv aggregation is scoped by `state`, so a single shared document
  // would leave every semconv column N/A no matter what value it carried.
  readonly docs: Readonly<Record<ConflictSchema, Readonly<Record<string, unknown>>>>;
}

const CONFLICT_SPECS: readonly ConflictSpec[] = [
  {
    name: 'aggMetric',
    affects: 'Memory Usage (resolvable via ::aggregate_metric_double)',
    host: CONFLICT_HOST_MEMORY,
    mappings: {
      [ECS_MEMORY_FIELD]: AGGREGATE_METRIC_DOUBLE,
      [SEMCONV_MEMORY_FIELD]: AGGREGATE_METRIC_DOUBLE,
    },
    docs: {
      ecs: { [ECS_MEMORY_FIELD]: AGGREGATE_METRIC_VALUE },
      // `used` is the state the semconv Memory Usage aggregation selects.
      semconv: { [SEMCONV_MEMORY_FIELD]: AGGREGATE_METRIC_VALUE, [STATE_FIELD]: 'used' },
    },
  },
  {
    name: 'mixedNumeric',
    affects: 'CPU Usage (numeric union; resolvable via ::double)',
    host: CONFLICT_HOST_CPU_DISK,
    mappings: {
      // The healthy data maps these as float, so `long` here makes the union
      // purely numeric — the most common real-world conflict.
      [ECS_CPU_FIELD]: { type: 'long' },
      [SEMCONV_CPU_FIELD]: { type: 'long' },
    },
    docs: {
      ecs: { [ECS_CPU_FIELD]: 1 },
      // The semconv tile computes `1 - AVG(utilization) WHERE state == idle`,
      // so a never-idle CPU reports the same 100% as the ECS document above.
      // A `long` cannot hold a fraction, which is this flavour's whole point.
      semconv: { [SEMCONV_CPU_FIELD]: 0, [STATE_FIELD]: 'idle' },
    },
  },
  {
    name: 'keywordMetric',
    affects: 'Disk Usage (string/number union; resolvable via ::double)',
    host: CONFLICT_HOST_CPU_DISK,
    mappings: {
      [ECS_DISK_FIELD]: KEYWORD,
      [SEMCONV_DISK_FIELD]: KEYWORD,
    },
    // Numeric-looking strings, so a `::double` cast yields a value rather than
    // nulls; a non-numeric value here would produce nulls plus ES|QL warnings.
    docs: {
      ecs: { [ECS_DISK_FIELD]: '0.42' },
      // Disk stays N/A in the table under both schemas whatever `state` says:
      // those aggregations read the field with `max`/`sum`, neither of which
      // can read a `keyword`. Only the ES|QL tiles recover it, via `::double`.
      semconv: { [SEMCONV_DISK_FIELD]: '42949672', [STATE_FIELD]: 'free' },
    },
  },
  {
    name: 'hostName',
    affects: 'ALL four tiles (grouping key; resolvable via ::keyword)',
    // `text` is what dynamic mapping infers for `host.name` in indices that
    // have no metricbeat/system template, and it conflicts with the `keyword`
    // of the real metrics indices.
    mappings: { [HOST_NAME_FIELD]: { type: 'text' } },
    docs: {
      ecs: { [HOST_NAME_FIELD]: 'kpi-conflict-text-host' },
      semconv: { [HOST_NAME_FIELD]: 'kpi-conflict-text-host' },
    },
  },
  {
    name: 'state',
    affects: 'semconv CPU / Memory / Disk on EVERY host (all scope by `state`)',
    // Cross-cutting: the union breaks the query for every host regardless of
    // which row this document lands on.
    host: CONFLICT_HOST_MEMORY,
    mappings: {
      [STATE_FIELD]: { type: 'object', properties: { name: KEYWORD } },
    },
    docs: {
      ecs: { [STATE_FIELD]: { name: 'idle' } },
      semconv: { [STATE_FIELD]: { name: 'idle' } },
    },
  },
];

const parseConflicts = (raw: string | undefined): readonly ConflictName[] => {
  const value = (raw ?? 'metrics').trim();
  const alias = CONFLICT_ALIASES[value];
  if (alias) return alias;

  const requested = value
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
  const unknown = requested.filter((part) => !CONFLICT_NAMES.includes(part as ConflictName));
  if (unknown.length) {
    throw new Error(
      `Unknown conflicts: ${unknown.join(', ')}. Expected a comma-separated list of ` +
        `${CONFLICT_NAMES.join(', ')} or one of ${Object.keys(CONFLICT_ALIASES).join(', ')}.`
    );
  }
  return requested as ConflictName[];
};

const parseMetricsets = (raw: string | undefined): ReadonlySet<string> =>
  new Set(
    (raw ?? '')
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean)
  );

const conflictIndexName = (name: ConflictName): string =>
  `${CONFLICT_INDEX_PREFIX}.${name.toLowerCase()}`;

const scenario: Scenario<InfraDocument> = async ({ logger, scenarioOpts, to }) => {
  const numHosts = getNumberOpt(scenarioOpts, 'numHosts', 3);
  const schemas = getStringOpt(scenarioOpts, 'schemas') ?? 'both';
  const conflicts = parseConflicts(getStringOpt(scenarioOpts, 'conflicts'));
  const omitted = parseMetricsets(getStringOpt(scenarioOpts, 'omitMetricsets'));

  if (!['both', 'ecs', 'semconv'].includes(schemas)) {
    throw new Error(`Unknown schemas option "${schemas}". Expected both, ecs or semconv.`);
  }
  const withEcs = schemas === 'both' || schemas === 'ecs';
  const withSemconv = schemas === 'both' || schemas === 'semconv';

  // Timestamp inside the queried range so the conflict docs are real hosts in
  // the page's time window rather than mapping-only artefacts.
  const conflictDocTimestamp = new Date(to - 30_000).toISOString();

  return {
    bootstrap: async (_synthtraceClients, _kibanaClient, esClient: Client) => {
      // Always drop every flavour, so changing `conflicts` between runs cannot
      // leave a stale conflict index behind. Named explicitly rather than by
      // wildcard: clusters default to `action.destructive_requires_name: true`.
      await esClient.indices.delete({
        index: CONFLICT_NAMES.map(conflictIndexName),
        ignore_unavailable: true,
        allow_no_indices: true,
      });

      if (conflicts.length === 0) {
        logger.info('conflicts=none: no conflicting indices created');
        return;
      }

      const specs = CONFLICT_SPECS.filter((spec) => conflicts.includes(spec.name));

      for (const spec of specs) {
        const index = conflictIndexName(spec.name);
        await esClient.indices.create({
          index,
          mappings: {
            properties: {
              '@timestamp': DATE,
              // Mapped explicitly as `keyword` so the schema `nodeFilter`
              // `term` queries match (dynamic mapping would make them `text`).
              [EVENT_MODULE_FIELD]: KEYWORD,
              [DATASTREAM_DATASET_FIELD]: KEYWORD,
              // Every flavour except `hostName` keeps the real `keyword`
              // mapping, so it does not also conflict on the grouping key.
              ...(spec.host === undefined ? {} : { [HOST_NAME_FIELD]: KEYWORD }),
              // Every semconv aggregation scopes by `state`, so the metric
              // flavours need a real one to be selectable at all. The `state`
              // flavour maps it itself, as an object — that IS its conflict.
              ...(STATE_FIELD in spec.mappings ? {} : { [STATE_FIELD]: KEYWORD }),
              ...spec.mappings,
            },
          },
        });
        logger.info(
          `created ${index} on ${spec.host ?? '(text host.name)'} -> affects ${spec.affects}`
        );
      }

      const body = specs.flatMap((spec) =>
        Object.entries(SCHEMA_MARKERS).flatMap(([schema, marker]) => [
          { create: { _index: conflictIndexName(spec.name) } },
          {
            '@timestamp': conflictDocTimestamp,
            ...(spec.host === undefined ? {} : { [HOST_NAME_FIELD]: spec.host }),
            ...marker,
            ...spec.docs[schema as ConflictSchema],
          },
        ])
      );
      await esClient.bulk({ body, refresh: true });
    },

    generate: ({ range, clients: { infraEsClient } }) => {
      const generators = [];

      if (withEcs) {
        const ecsHosts = times(numHosts).map((index) => infra.host(`kpi-ecs-host-${index}`));
        const ecsMetrics = range
          .interval('30s')
          .rate(1)
          .generator((timestamp) =>
            ecsHosts.flatMap((host) => [
              ...(omitted.has('cpu') ? [] : [host.cpu().timestamp(timestamp)]),
              ...(omitted.has('memory') ? [] : [host.memory().timestamp(timestamp)]),
              // `load` is left clean by every conflict flavour on purpose:
              // Normalized Load is the control tile that must always render.
              ...(omitted.has('load') ? [] : [host.load().timestamp(timestamp)]),
              // `infra.host().filesystem()` defaults this to 12.23, which the
              // Disk Usage tile renders as 1223%. Pass a real ratio instead so
              // the control run looks like a healthy fleet.
              ...(omitted.has('filesystem')
                ? []
                : [
                    host
                      .filesystem({ 'system.filesystem.used.pct': ECS_DISK_USED_PCT })
                      .timestamp(timestamp),
                  ]),
              ...(omitted.has('network') ? [] : [host.network().timestamp(timestamp)]),
              // Not a KPI field — the Hosts Metrics-tab Disk IOPS / throughput
              // Lens charts read `system.diskio.*`, and without these docs they
              // warn "field was not found".
              ...(omitted.has('diskio') ? [] : [host.diskio().timestamp(timestamp)]),
            ])
          );
        generators.push(
          withClient(
            infraEsClient,
            logger.perf('generating_kpi_ecs_hosts', () => ecsMetrics)
          )
        );
      }

      if (withSemconv) {
        const semconvHosts = times(numHosts).map((index) =>
          infra.semconvHost(`kpi-semconv-host-${index}`)
        );
        const semconvMetrics = range
          .interval('30s')
          .rate(1)
          .generator((timestamp) =>
            semconvHosts.flatMap((host) => {
              // These builders return one document per `state`, and the semconv
              // KPI formulas select states inside the query. Stagger by 1 ms per
              // doc: TSDB derives `_id` from dimensions that exclude `state`, so
              // an identical @timestamp + metricset would be a duplicate `_id`.
              const docs = [
                ...(omitted.has('cpu') ? [] : host.cpu()),
                ...(omitted.has('memory') ? [] : host.memory()),
                ...(omitted.has('filesystem') ? [] : host.filesystem()),
              ];
              return docs.map((doc, index) => doc.timestamp(timestamp + index));
            })
          );
        generators.push(
          withClient(
            infraEsClient,
            logger.perf('generating_kpi_semconv_hosts', () => semconvMetrics)
          )
        );
      }

      return generators;
    },
  };
};

export default scenario;
