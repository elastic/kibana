/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Time-series histogram data for the Metrics grid in Discover: bounds,
 * distributions, heatmaps, and the settings that switch between them.
 *
 * Run instructions and options live in EXAMPLES.md (`metrics_histogram_distributions`).
 */

import type { Client } from '@elastic/elasticsearch';
import type { MappingProperty } from '@elastic/elasticsearch/lib/api/types';
import type { Scenario } from '../cli/scenario';
import { getSynthtraceEnvironment } from '../lib/utils/get_synthtrace_environment';
import { getBooleanOpt, getNumberOpt, getStringOpt } from './helpers/scenario_opts_helpers';

const ENVIRONMENT = getSynthtraceEnvironment(__filename);

const DEFAULT_INDEX_NAME = 'test-metrics-histograms';
const MIXED_INDEX_SUFFIX = '-mixed';

const TDIGEST_FIELD = 'latency.tdigest';

const BULK_CHUNK_SIZE = 500;
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Mappings stay untyped until the ES client's `MappingProperty` includes `tdigest`.
 * Once it does, the cast at `indices.create` can go away.
 */
type EsMappingProperty = Record<string, unknown>;

interface LegacyHistogramValue {
  readonly values: number[];
  readonly counts: number[];
}

interface TDigestValue {
  readonly centroids: number[];
  readonly counts: number[];
  readonly min: number;
  readonly max: number;
}

interface ExponentialBuckets {
  readonly indices: number[];
  readonly counts: number[];
}

interface NativeExponentialHistogramValue {
  readonly scale: number;
  readonly zero: { threshold: number; count: number };
  readonly positive: ExponentialBuckets;
  readonly negative: ExponentialBuckets;
  readonly min: number;
  readonly max: number;
}

type MetricValue = LegacyHistogramValue | TDigestValue | NativeExponentialHistogramValue | number;

interface PointContext {
  /** Position in the run range, 0 at `--from` and 1 at `--to`. */
  readonly progress: number;
  readonly hostIndex: number;
  readonly bucketIndex: number;
  /** 1 away from the spike, rising to ~8 at its peak. */
  readonly spikeFactor: number;
  /** Observations recorded in this interval. */
  readonly volume: number;
  readonly random: () => number;
}

interface MetricSpec {
  readonly name: string;
  readonly mapping: EsMappingProperty;
  /** Returning `undefined` leaves the field out of the document entirely. */
  readonly value: (context: PointContext) => MetricValue | undefined;
}

/**
 * Deterministic PRNG, so two runs over the same range produce identical
 * documents and a screenshot taken today still matches tomorrow.
 */
const LEHMER_MODULUS = 2147483647;

const randomFor = (...seedParts: number[]): (() => number) => {
  let state = seedParts.reduce((acc, part) => (acc * 31 + part + 1) % LEHMER_MODULUS, 7919);
  if (state <= 0) {
    state = 1;
  }
  return () => {
    // Park-Miller minimal standard generator; stays well inside Number.MAX_SAFE_INTEGER.
    state = (state * 48271) % LEHMER_MODULUS;
    return (state - 1) / (LEHMER_MODULUS - 1);
  };
};

const round = (value: number, decimals: number): number => {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
};

/** Histogram and tdigest fields reject values that are not strictly ascending. */
const strictlyAscending = (values: number[]): number[] => {
  const sorted = [...values].sort((a, b) => a - b);
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] <= sorted[i - 1]) {
      sorted[i] = round(sorted[i - 1] + 0.001, 3);
    }
  }
  return sorted;
};

// A right-skewed latency shape: most observations near the centre, a thin tail.
const SHAPE_OFFSETS = [0.4, 0.7, 1, 1.5, 2.5, 4] as const;
const SHAPE_WEIGHTS = [0.08, 0.22, 0.34, 0.22, 0.1, 0.04] as const;

const buildDistribution = (
  center: number,
  volume: number,
  random: () => number
): LegacyHistogramValue => ({
  values: strictlyAscending(
    SHAPE_OFFSETS.map((offset) => round(center * offset * (0.95 + random() * 0.1), 3))
  ),
  counts: SHAPE_WEIGHTS.map((weight) =>
    Math.max(1, Math.round(volume * weight * (0.7 + random() * 0.6)))
  ),
});

const EXP_SCALE = 2;
// Bucket i of an exponential histogram covers (base^i, base^(i+1)] where
// base = 2^(2^-scale), so ln(base) = 2^-scale * ln(2).
const LOG_EXP_BASE = Math.log(2) * 2 ** -EXP_SCALE;

const exponentialBucketIndex = (value: number): number =>
  Math.ceil(Math.log(value) / LOG_EXP_BASE) - 1;

const toExponentialBuckets = (values: number[], counts: number[]): ExponentialBuckets => {
  const byIndex = new Map<number, number>();
  values.forEach((value, position) => {
    const index = exponentialBucketIndex(value);
    byIndex.set(index, (byIndex.get(index) ?? 0) + counts[position]);
  });
  const indices = [...byIndex.keys()].sort((a, b) => a - b);
  return { indices, counts: indices.map((index) => byIndex.get(index) ?? 0) };
};

const HISTOGRAM_MAPPING: EsMappingProperty = {
  type: 'histogram',
  time_series_metric: 'histogram',
};

const EXPONENTIAL_MAPPING: EsMappingProperty = {
  type: 'exponential_histogram',
  time_series_metric: 'histogram',
};

const TDIGEST_MAPPING: EsMappingProperty = {
  type: 'tdigest',
  time_series_metric: 'histogram',
};

const toTDigest = ({ values, counts }: LegacyHistogramValue): TDigestValue => ({
  centroids: values,
  counts,
  // Supplied rather than estimated, so MIN/MAX are exact.
  min: values[0],
  max: values[values.length - 1],
});

const isTDigestValue = (value: MetricValue | undefined): value is TDigestValue =>
  typeof value === 'object' && 'centroids' in value;

/** Remaps a `tdigest` field as a legacy `histogram` with the same centroids. */
const asLegacyHistogram = (metric: MetricSpec): MetricSpec => ({
  ...metric,
  mapping: HISTOGRAM_MAPPING,
  value: (context) => {
    const value = metric.value(context);
    return isTDigestValue(value) ? { values: value.centroids, counts: value.counts } : value;
  },
});

/** Slice of the run range, as a fraction, over which `latency.sparse` reports. */
const SPARSE_WINDOW = { from: 0.4, to: 1 } as const;

// Fixed bounds so `latency.signed` is assertable: MIN must be -120, MAX 210.
const SIGNED_NEGATIVES = { values: [5, 40, 120], counts: [12, 30, 8] };
const SIGNED_POSITIVES = { values: [8, 55, 210], counts: [40, 90, 15] };

const CORE_METRICS: readonly MetricSpec[] = [
  {
    // Covers the `TO_TDIGEST(...)` cast path.
    name: 'latency.legacy',
    mapping: HISTOGRAM_MAPPING,
    value: ({ spikeFactor, hostIndex, volume, random }) =>
      buildDistribution(45 * spikeFactor * (1 + hostIndex * 0.4), volume, random),
  },
  {
    // Covers the uncast path; same shape as `latency.legacy` so the two can be compared.
    name: 'latency.exp',
    mapping: EXPONENTIAL_MAPPING,
    value: ({ spikeFactor, hostIndex, volume, random }) =>
      buildDistribution(45 * spikeFactor * (1 + hostIndex * 0.4), volume, random),
  },
  {
    // Covers the uncast path with exact stored min/max.
    name: TDIGEST_FIELD,
    mapping: TDIGEST_MAPPING,
    value: ({ spikeFactor, volume, random }) =>
      toTDigest(buildDistribution(60 * spikeFactor, volume, random)),
  },
  {
    // Covers two stable modes, so a heatmap shows two bands.
    name: 'latency.bimodal',
    mapping: EXPONENTIAL_MAPPING,
    value: ({ progress, volume, random }) => {
      // The two modes stay put; only their relative weight breathes, so the
      // heatmap should show two steady bands of varying intensity.
      const fastShare = 0.5 + 0.35 * Math.sin(progress * Math.PI * 6);
      const fast = Math.max(1, Math.round(volume * fastShare));
      const slow = Math.max(1, volume - fast);
      return {
        values: [14, 18, 24, 240, 300, 380],
        counts: [
          Math.max(1, Math.round(fast * 0.3)),
          Math.max(1, Math.round(fast * 0.45)),
          Math.max(1, Math.round(fast * 0.25)),
          Math.max(1, Math.round(slow * 0.3)),
          Math.max(1, Math.round(slow * 0.45)),
          Math.max(1, Math.round(slow * 0.25 * (0.7 + random() * 0.6))),
        ],
      };
    },
  },
  {
    // Covers 0.001 to 10000, several orders of magnitude.
    name: 'latency.wide',
    mapping: EXPONENTIAL_MAPPING,
    value: ({ volume, random }) => ({
      values: [0.001, 0.05, 1, 40, 900, 10000],
      counts: SHAPE_WEIGHTS.map((weight) =>
        Math.max(1, Math.round(volume * weight * (0.7 + random() * 0.6)))
      ),
    }),
  },
  {
    // Covers one centroid, so min == max (the `point` case).
    name: 'latency.point',
    mapping: HISTOGRAM_MAPPING,
    value: ({ volume }) => ({ values: [5], counts: [volume] }),
  },
  {
    // Covers a field absent from the first 40% of the range.
    name: 'latency.sparse',
    mapping: HISTOGRAM_MAPPING,
    // Reports over the middle of the range only, so a window outside that
    // slice returns no bounds for this field while the others still resolve.
    // Kept wide because METRICS_INFO samples documents: at a few percent
    // coverage the field is never discovered, so the grid never charts it.
    value: ({ progress, volume, random }) =>
      progress >= SPARSE_WINDOW.from && progress <= SPARSE_WINDOW.to
        ? buildDistribution(700, volume, random)
        : undefined,
  },
  {
    // Covers negative, zero, and positive buckets in native form.
    name: 'latency.signed',
    mapping: EXPONENTIAL_MAPPING,
    // Written in the native OTel form rather than the coerced values/counts
    // shape, which is the only way to populate the zero and negative buckets.
    value: ({ volume }) => ({
      scale: EXP_SCALE,
      zero: { threshold: 0.5, count: Math.max(1, Math.round(volume * 0.05)) },
      positive: toExponentialBuckets(SIGNED_POSITIVES.values, SIGNED_POSITIVES.counts),
      negative: toExponentialBuckets(SIGNED_NEGATIVES.values, SIGNED_NEGATIVES.counts),
      min: -120,
      max: 210,
    }),
  },
  {
    // Covers a gauge the bounds query must skip.
    name: 'system.cpu.utilization',
    mapping: { type: 'double', time_series_metric: 'gauge' },
    value: ({ progress, hostIndex, random }) =>
      round(0.3 + 0.25 * Math.sin(progress * Math.PI * 4 + hostIndex) + random() * 0.05, 4),
  },
  {
    // Covers a counter the bounds query must skip.
    name: 'system.requests.count',
    mapping: { type: 'long', time_series_metric: 'counter' },
    value: ({ bucketIndex, hostIndex }) => bucketIndex * 37 + hostIndex * 1000,
  },
];

const mixedDistribution = ({ hostIndex, volume, random }: PointContext): LegacyHistogramValue =>
  buildDistribution(20 * (1 + hostIndex * 0.4), volume, random);

/**
 * Every core field again, each with a different mapping from `CORE_METRICS`,
 * so a wildcard over both indices charts every field once per type.
 */
const MIXED_METRICS: readonly MetricSpec[] = [
  {
    // Covers the uncast path for the same field the main index casts.
    name: 'latency.legacy',
    mapping: EXPONENTIAL_MAPPING,
    value: mixedDistribution,
  },
  {
    // Covers the `TO_TDIGEST(...)` cast path for the same field the main index leaves uncast.
    name: 'latency.exp',
    mapping: HISTOGRAM_MAPPING,
    value: mixedDistribution,
  },
  {
    // Covers the uncast exponential path for the field stored as `tdigest` on the main index.
    name: TDIGEST_FIELD,
    mapping: EXPONENTIAL_MAPPING,
    value: mixedDistribution,
  },
  {
    // Covers `tdigest` with exact stored min/max.
    name: 'latency.bimodal',
    mapping: TDIGEST_MAPPING,
    value: (context) => toTDigest(mixedDistribution(context)),
  },
  {
    // Covers the `TO_TDIGEST(...)` cast path.
    name: 'latency.wide',
    mapping: HISTOGRAM_MAPPING,
    value: mixedDistribution,
  },
  {
    // Covers `tdigest` with min == max.
    name: 'latency.point',
    mapping: TDIGEST_MAPPING,
    value: ({ volume }) => ({ centroids: [5], counts: [volume], min: 5, max: 5 }),
  },
  {
    // Covers the uncast path over the same sparse window as the main index.
    name: 'latency.sparse',
    mapping: EXPONENTIAL_MAPPING,
    value: (context) =>
      context.progress >= SPARSE_WINDOW.from && context.progress <= SPARSE_WINDOW.to
        ? buildDistribution(350, context.volume, context.random)
        : undefined,
  },
  {
    // Covers a gauge the bounds query must skip.
    name: 'latency.signed',
    mapping: { type: 'double', time_series_metric: 'gauge' },
    value: ({ random }) => round(-120 + random() * 330, 3),
  },
  {
    // Covers a gauge the bounds query must skip.
    name: 'system.cpu.utilization',
    mapping: { type: 'long', time_series_metric: 'gauge' },
    value: ({ progress, hostIndex }) =>
      Math.round(30 + 25 * Math.sin(progress * Math.PI * 4 + hostIndex)),
  },
  {
    // Covers a counter the bounds query must skip.
    name: 'system.requests.count',
    mapping: { type: 'double', time_series_metric: 'counter' },
    value: ({ bucketIndex, hostIndex }) => bucketIndex * 12.5 + hostIndex * 500,
  },
];

/**
 * Named `zz_` so they sort after the real fields: page 1 of the grid then holds
 * every real field plus some fillers, and page 2 holds fillers only. Both pages
 * carry histograms, which is what makes the per-page bounds fetch observable.
 */
const buildFillerMetrics = (count: number): MetricSpec[] =>
  Array.from({ length: count }, (_, index) => ({
    name: `zz_filler.histogram_${index}`,
    mapping: EXPONENTIAL_MAPPING,
    value: ({ volume, random }: PointContext) => buildDistribution(10 + index * 5, volume, random),
  }));

const buildMappingProperties = (
  metrics: readonly MetricSpec[],
  dimensions: readonly string[]
): Record<string, EsMappingProperty> => {
  const properties: Record<string, EsMappingProperty> = {
    '@timestamp': { type: 'date' },
    // Not a dimension, so it stays out of the breakdown list while still
    // marking every document this scenario wrote.
    scenario: { type: 'keyword' },
  };
  for (const dimension of dimensions) {
    properties[dimension] = { type: 'keyword', time_series_dimension: true };
  }
  for (const metric of metrics) {
    properties[metric.name] = metric.mapping;
  }
  return properties;
};

const createTsdbIndex = async (
  esClient: Client,
  options: {
    index: string;
    properties: Record<string, EsMappingProperty>;
    routingPath: readonly string[];
    startTime: string;
    endTime: string;
  }
): Promise<void> => {
  await esClient.indices.create({
    index: options.index,
    settings: {
      mode: 'time_series',
      routing_path: [...options.routingPath],
      time_series: { start_time: options.startTime, end_time: options.endTime },
    },
    mappings: { properties: options.properties as Record<string, MappingProperty> },
  });
};

const scenario: Scenario = async ({ logger, from, to, scenarioOpts }) => {
  const opts = (scenarioOpts ?? {}) as Record<string, unknown>;

  const indexName = getStringOpt(opts, 'indexName') ?? DEFAULT_INDEX_NAME;
  const mixedIndexName = `${indexName}${MIXED_INDEX_SUFFIX}`;
  const hostCount = Math.max(1, getNumberOpt(opts, 'hosts', 3));
  const serviceCount = Math.max(1, getNumberOpt(opts, 'services', 2));
  const fillerCount = Math.max(0, getNumberOpt(opts, 'fillerHistograms', 12));
  const maxDocuments = Math.max(1, getNumberOpt(opts, 'maxDocuments', 20000));
  const withMixedIndex = getBooleanOpt(opts, 'mixedTypeIndex', true);
  const withSpike = getBooleanOpt(opts, 'spike', true);

  const hosts = Array.from({ length: hostCount }, (_, i) => `host-${i + 1}`);
  const services = Array.from(
    { length: serviceCount },
    (_, i) => ['checkout', 'search', 'cart', 'payments'][i % 4] + (i > 3 ? `-${i}` : '')
  );
  const dimensions = ['host.name', 'service.name'] as const;
  const metrics = [...CORE_METRICS, ...buildFillerMetrics(fillerCount)];

  const seriesCount = hosts.length * services.length;
  const rangeMs = Math.abs(to - from);
  const requestedIntervalMs = Math.max(1, getNumberOpt(opts, 'intervalSeconds', 60)) * 1000;
  // Widen the interval rather than refusing to run, so `--from now-1w` still works.
  const minIntervalMs = Math.ceil((rangeMs * seriesCount) / maxDocuments);
  const intervalMs = Math.max(requestedIntervalMs, minIntervalMs);
  const bucketCount = Math.max(1, Math.floor(rangeMs / intervalMs));

  return {
    bootstrap: async (_clients, _kibanaClient, esClient: Client) => {
      await esClient.indices.delete({
        index: [indexName, mixedIndexName],
        ignore_unavailable: true,
        allow_no_indices: true,
      });

      const startTime = new Date(from - DAY_MS).toISOString();
      const endTime = new Date(to + DAY_MS).toISOString();

      // ES 9.6 accepts `time_series_metric` on a `tdigest` field, but the type
      // is only a 9.3 preview, so degrade in steps on older clusters instead of
      // failing the whole run, and say which step was used.
      const tdigestFallbacks: ReadonlyArray<{ label: string; mapping?: EsMappingProperty }> = [
        {
          label: 'tdigest with time_series_metric',
          mapping: { type: 'tdigest', time_series_metric: 'histogram' },
        },
        { label: 'tdigest without time_series_metric', mapping: { type: 'tdigest' } },
        { label: 'tdigest field omitted', mapping: undefined },
      ];

      let acceptedMetrics: MetricSpec[] = [];
      let created = false;
      let isTDigestMetricSupported = false;
      let lastError: unknown;

      for (const fallback of tdigestFallbacks) {
        const candidates = metrics.flatMap((metric) => {
          if (metric.name !== TDIGEST_FIELD) return [metric];
          return fallback.mapping ? [{ ...metric, mapping: fallback.mapping }] : [];
        });
        try {
          await createTsdbIndex(esClient, {
            index: indexName,
            properties: buildMappingProperties(candidates, dimensions),
            routingPath: dimensions,
            startTime,
            endTime,
          });
          acceptedMetrics = candidates;
          created = true;
          isTDigestMetricSupported = fallback.label === tdigestFallbacks[0].label;
          if (!isTDigestMetricSupported) {
            logger.warning(`Index created with fallback mapping: ${fallback.label}`);
          }
          break;
        } catch (error) {
          lastError = error;
          logger.debug(`Mapping attempt "${fallback.label}" rejected: ${error}`);
          await esClient.indices.delete({ index: indexName, ignore_unavailable: true });
        }
      }

      if (!created) {
        throw lastError;
      }

      const mixedMetrics = withMixedIndex
        ? MIXED_METRICS.map((metric) =>
            isTDigestMetricSupported || metric.mapping.type !== 'tdigest'
              ? metric
              : asLegacyHistogram(metric)
          )
        : [];

      if (withMixedIndex) {
        await createTsdbIndex(esClient, {
          index: mixedIndexName,
          properties: buildMappingProperties(mixedMetrics, dimensions),
          routingPath: dimensions,
          startTime,
          endTime,
        });
      }

      let operations: Array<Record<string, unknown>> = [];
      let indexed = 0;

      const flush = async (): Promise<void> => {
        if (operations.length === 0) return;
        const response = await esClient.bulk({ operations, refresh: false });
        if (response.errors) {
          const firstFailure = response.items
            .map((item) => item.create?.error)
            .find((error) => error !== undefined);
          throw new Error(`Bulk indexing failed: ${JSON.stringify(firstFailure)}`);
        }
        indexed += operations.length / 2;
        operations = [];
      };

      for (let bucketIndex = 0; bucketIndex < bucketCount; bucketIndex++) {
        const timestamp = from + bucketIndex * intervalMs;
        const progress = bucketCount === 1 ? 0.5 : bucketIndex / (bucketCount - 1);
        // A Gaussian plume centred mid-range: smooth enough that the heatmap
        // shows the distribution climbing and settling rather than jumping.
        const spikeFactor = withSpike
          ? 1 + 7 * Math.exp(-((progress - 0.5) ** 2) / (2 * 0.03 ** 2))
          : 1;

        for (const [hostIndex, host] of hosts.entries()) {
          for (const [serviceIndex, service] of services.entries()) {
            const random = randomFor(bucketIndex, hostIndex, serviceIndex);
            const context: PointContext = {
              progress,
              hostIndex,
              bucketIndex,
              spikeFactor,
              volume: 120 + Math.round(random() * 240),
              random,
            };

            const buildDocument = (
              documentMetrics: readonly MetricSpec[]
            ): Record<string, unknown> => {
              const document: Record<string, unknown> = {
                '@timestamp': new Date(timestamp).toISOString(),
                'host.name': host,
                'service.name': service,
                scenario: ENVIRONMENT,
              };
              for (const metric of documentMetrics) {
                const value = metric.value(context);
                if (value !== undefined) {
                  document[metric.name] = value;
                }
              }
              return document;
            };

            operations.push({ create: { _index: indexName } }, buildDocument(acceptedMetrics));

            if (withMixedIndex && (bucketIndex % 5 === 0 || bucketIndex === bucketCount - 1)) {
              operations.push({ create: { _index: mixedIndexName } }, buildDocument(mixedMetrics));
            }

            if (operations.length >= BULK_CHUNK_SIZE * 2) {
              await flush();
            }
          }
        }
      }

      await flush();
      await esClient.indices.refresh({
        index: [indexName, mixedIndexName],
        ignore_unavailable: true,
      });

      logger.info(
        `Indexed ${indexed} documents into ${indexName}${
          withMixedIndex ? ` and ${mixedIndexName}` : ''
        }: ${acceptedMetrics.length} metric fields, ${seriesCount} series, ` +
          `${bucketCount} points every ${intervalMs / 1000}s`
      );
      logger.info(`Open Discover in ES|QL mode and run: TS ${indexName}`);
      if (withMixedIndex) {
        logger.info(`For one chart per field type across both indices, run: TS ${indexName}*`);
      }
    },

    // Every document is written by `bootstrap` with the raw client, because no
    // synthtrace client writes to a hand-rolled time_series index.
    generate: () => [],
  };
};

export default scenario;
