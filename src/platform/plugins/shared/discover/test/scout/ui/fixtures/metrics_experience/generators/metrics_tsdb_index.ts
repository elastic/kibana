/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EsClient } from '@kbn/scout';
import type { MappingTimeSeriesMetricType } from '@elastic/elasticsearch/lib/api/types';
import { errors } from '@elastic/elasticsearch';
import { METRICS_TEST_INDEX_NAME } from '../constants';

export interface MetricDefinition {
  readonly name: string;
  readonly type: MappingTimeSeriesMetricType;
}

export interface DimensionDefinition {
  readonly name: string;
  readonly values: readonly string[];
}

export interface MetricsIndexConfig {
  readonly indexName: string;
  readonly dimensions: readonly DimensionDefinition[];
  readonly metrics: readonly MetricDefinition[];
  readonly timeRange: {
    readonly from: string;
    readonly to: string;
    readonly documentsBaseTime: string;
  };
}

type EsMappingProperty = Record<string, unknown>;

const MAX_METRICS = 200;
const MAX_DIMENSIONS = 50;
const MAX_VALUES_PER_DIMENSION = 20;
const PAGE_SIZE = 20;

export const TEST_TIME_ANCHOR = Date.now();

export const TIME_OFFSETS = {
  TSDB_WINDOW: 6 * 60 * 60 * 1000,
  INDEX_DOCS_BASE: 30 * 60 * 1000,
  DATA_STREAM_DOCS_BASE: 60 * 60 * 1000,
  QUERY_EXTRA_PADDING: 2 * 60 * 60 * 1000,
} as const;

const INDEX_TIME_RANGE = {
  from: new Date(TEST_TIME_ANCHOR - TIME_OFFSETS.TSDB_WINDOW).toISOString(),
  to: new Date(TEST_TIME_ANCHOR + TIME_OFFSETS.TSDB_WINDOW).toISOString(),
  documentsBaseTime: new Date(TEST_TIME_ANCHOR - TIME_OFFSETS.INDEX_DOCS_BASE).toISOString(),
};

export const DEFAULT_TIME_RANGE = {
  from: new Date(TEST_TIME_ANCHOR - TIME_OFFSETS.TSDB_WINDOW).toISOString(),
  to: new Date(
    TEST_TIME_ANCHOR + TIME_OFFSETS.TSDB_WINDOW + TIME_OFFSETS.QUERY_EXTRA_PADDING
  ).toISOString(),
};

export const BRUSH_TIME_RANGE = {
  from: new Date(TEST_TIME_ANCHOR - TIME_OFFSETS.INDEX_DOCS_BASE - 30 * 60 * 1000).toISOString(),
  to: new Date(TEST_TIME_ANCHOR - TIME_OFFSETS.INDEX_DOCS_BASE + 30 * 60 * 1000).toISOString(),
};

export const DEFAULT_CONFIG: MetricsIndexConfig = {
  indexName: METRICS_TEST_INDEX_NAME,
  dimensions: generateDimensions(30),
  metrics: [...generateMetrics(23, 'gauge'), ...generateMetrics(22, 'counter')],
  timeRange: INDEX_TIME_RANGE,
};

export const TOTAL_METRIC_FIELDS = DEFAULT_CONFIG.metrics.length;

export const PAGINATION = {
  PAGE_SIZE,
  TOTAL_PAGES: Math.ceil(TOTAL_METRIC_FIELDS / PAGE_SIZE),
  LAST_PAGE_CARDS: TOTAL_METRIC_FIELDS % PAGE_SIZE || PAGE_SIZE,
} as const;

export const DIMENSIONS_PAGINATION = {
  PAGE_SIZE,
  TOTAL_PAGES: Math.ceil(DEFAULT_CONFIG.dimensions.length / PAGE_SIZE),
  LAST_PAGE_ITEMS: DEFAULT_CONFIG.dimensions.length % PAGE_SIZE || PAGE_SIZE,
} as const;

function getEsMapping({ type }: MetricDefinition): EsMappingProperty {
  switch (type) {
    case 'gauge':
      return { type: 'double', time_series_metric: 'gauge' };
    case 'counter':
      return { type: 'long', time_series_metric: 'counter' };
    default:
      throw new Error(`Unsupported metric type: ${type}`);
  }
}

function generateValue({ type }: MetricDefinition): number {
  switch (type) {
    case 'gauge':
      return Math.random() * 100;
    case 'counter':
      return Math.floor(Math.random() * 10000);
    default:
      throw new Error(`Unsupported metric type: ${type}`);
  }
}

export function buildMappingProperties(
  config: MetricsIndexConfig
): Record<string, EsMappingProperty> {
  const properties: Record<string, EsMappingProperty> = {
    '@timestamp': { type: 'date' },
  };

  for (const dim of config.dimensions) {
    properties[dim.name] = { type: 'keyword', time_series_dimension: true };
  }

  for (const metric of config.metrics) {
    properties[metric.name] = getEsMapping(metric);
  }

  return properties;
}

/**
 * Generates metric definitions with names like `gauge_0`, `counter_1`.
 */
export function generateMetrics(
  count: number,
  type: MappingTimeSeriesMetricType
): MetricDefinition[] {
  if (count > MAX_METRICS) {
    throw new Error(`Cannot generate more than ${MAX_METRICS} metrics (requested: ${count})`);
  }
  return Array.from({ length: count }, (_, i) => ({
    name: `${type}_${i}`,
    type,
  }));
}

/**
 * Generates dimension definitions with names like `dimension_0` and values like `d0_v0`.
 */
export function generateDimensions(
  count: number,
  valuesPerDimension: number = 3
): DimensionDefinition[] {
  if (count > MAX_DIMENSIONS) {
    throw new Error(`Cannot generate more than ${MAX_DIMENSIONS} dimensions (requested: ${count})`);
  }
  if (valuesPerDimension > MAX_VALUES_PER_DIMENSION) {
    throw new Error(
      `Cannot generate more than ${MAX_VALUES_PER_DIMENSION} values per dimension (requested: ${valuesPerDimension})`
    );
  }
  return Array.from({ length: count }, (__, i) => ({
    name: `dimension_${i}`,
    values: Array.from({ length: valuesPerDimension }, (___, j) => `d${i}_v${j}`),
  }));
}

/**
 * Creates a TSDB index with metric fields detected by Metrics Experience.
 */
export async function createMetricsTestIndex(
  esClient: EsClient,
  config: MetricsIndexConfig = DEFAULT_CONFIG
): Promise<void> {
  const routingPath = config.dimensions.map((d) => d.name);

  await esClient.indices.create({
    index: config.indexName,
    settings: {
      mode: 'time_series',
      routing_path: routingPath,
      time_series: {
        start_time: config.timeRange.from,
        end_time: config.timeRange.to,
      },
    },
    mappings: { properties: buildMappingProperties(config) },
  });
}

/**
 * Deletes the metrics test index. Silently ignores if it doesn't exist.
 */
export async function cleanMetricsTestIndex(
  esClient: EsClient,
  indexName: string = DEFAULT_CONFIG.indexName
): Promise<void> {
  await esClient.indices.delete({ index: indexName, ignore_unavailable: true });
}

/**
 * Creates the metrics test index and inserts documents only if the index does not already exist.
 *
 * Includes a defensive catch for `resource_already_exists_exception` to handle the race
 * condition where parallel Playwright setup projects may attempt to create the same index
 * concurrently.
 */
export async function createMetricsTestIndexIfNeeded(
  esClient: EsClient,
  config: MetricsIndexConfig = DEFAULT_CONFIG
): Promise<boolean> {
  const exists = await esClient.indices.exists({ index: config.indexName });
  if (exists) {
    return false;
  }

  try {
    await createMetricsTestIndex(esClient, config);
    await insertMetricsDocuments(esClient, config);
    return true;
  } catch (error) {
    if (
      error instanceof errors.ResponseError &&
      error.body?.error?.type === 'resource_already_exists_exception'
    ) {
      return false;
    }
    throw error;
  }
}

export function buildDocument(
  index: number,
  baseTime: number,
  config: MetricsIndexConfig
): Record<string, unknown> {
  const { dimensions, metrics } = config;
  return {
    '@timestamp': new Date(baseTime + index * 60_000).toISOString(),
    ...Object.fromEntries(dimensions.map((d) => [d.name, d.values[index % d.values.length]])),
    ...Object.fromEntries(metrics.map((m) => [m.name, generateValue(m)])),
  };
}

/**
 * Inserts sample documents into the metrics test index.
 */
export async function insertMetricsDocuments(
  esClient: EsClient,
  config: MetricsIndexConfig = DEFAULT_CONFIG,
  count: number = 10
): Promise<void> {
  const baseTime = new Date(config.timeRange.documentsBaseTime).getTime();

  const operations = Array.from({ length: count }).flatMap((_, i) => [
    { index: { _index: config.indexName } },
    buildDocument(i, baseTime, config),
  ]);

  await esClient.bulk({ operations, refresh: true });
}
