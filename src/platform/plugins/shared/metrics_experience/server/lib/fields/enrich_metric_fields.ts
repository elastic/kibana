/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { type Logger } from '@kbn/core/server';
import type { TracedElasticsearchClient } from '@kbn/traced-es-client';
import { semconvFlat } from '@kbn/otel-semantic-conventions';
import { dateRangeQuery } from '@kbn/es-query';
import { from as fromCommand, where, limit, append } from '@kbn/esql-composer';
import type { QueryOperator } from '@kbn/esql-composer';
import { Parser, Walker, BasicPrettyPrinter } from '@kbn/esql-ast';
import pLimit from 'p-limit';
import { chunk } from 'lodash';
import type { IndexFieldCapsMap, EpochTimeRange } from '../../types';
import type { Dimension, MetricField, DimensionFilters } from '../../../common/types';
import { extractDimensions } from '../dimensions/extract_dimensions';
import { normalizeUnit } from './normalize_unit';

export interface MetricMetadata {
  dimensions: string[];
  unitFromSample?: string;
  totalHits: number;
}

export interface EsqlQueryResult {
  metricField: MetricField;
  columns: string[];
  values: unknown[][];
  error?: Error;
}

export type MetricMetadataMap = Map<string, MetricMetadata>;

// Maximum number of concurrent request batches to avoid rate limiting (429 errors)
const MAX_CONCURRENT_REQUESTS = 10;
// Number of metric fields to process per batch
const FIELDS_PER_BATCH = 20;
export function generateMapKey(indexName: string, fieldName: string) {
  return `${fieldName}>${indexName}`;
}

function buildMetricMetadataMapFromEsql(
  results: EsqlQueryResult[],
  logger: Logger
): MetricMetadataMap {
  const entries = new Map<string, MetricMetadata>();

  for (const { metricField, columns, values, error } of results) {
    const { name, index: indexName, dimensions: metricDimensions } = metricField;

    // Build fields to keep
    const dimensionsSet = new Set([...metricDimensions.map((d) => d.name), semconvFlat.unit.name]);

    const mapKey = generateMapKey(indexName, name);

    if (error) {
      logger.error(`Error sampling document for metric ${name}: ${error.message}`);
      entries.set(mapKey, { dimensions: [], totalHits: 0 });
      continue;
    }

    if (
      columns.length === 0 ||
      values.length === 0 ||
      values.every((value) => value === null || value === undefined)
    ) {
      entries.set(mapKey, { dimensions: [], totalHits: 0 });
      continue;
    }

    // Extract dimension field names that have values in the sample
    const dimensions = columns.filter((fieldName, index) => {
      if (!dimensionsSet.has(fieldName) || fieldName === semconvFlat.unit.name) {
        return false;
      }
      const value = values[0][index];
      return value !== null && value !== undefined;
    });

    // Extract unit value from the sample if present and valid
    const unitIndex = columns.indexOf(semconvFlat.unit.name);
    const unitValue = unitIndex !== -1 ? values[0][unitIndex] : undefined;
    const unitFromSample = typeof unitValue === 'string' ? unitValue : undefined;

    entries.set(mapKey, {
      dimensions,
      unitFromSample,
      totalHits: values[0].length,
    });
  }

  return entries;
}

function buildFilterConditions(
  filterEntries: Array<[string, string[]]>,
  dimensions: Dimension[],
  query: string
): QueryOperator[] {
  if (filterEntries.length === 0 && query.length === 0) {
    return [];
  }

  const dimensionMap = new Map(dimensions.map((dimension) => [dimension.name, dimension]));

  const filterConditions = filterEntries
    .map(([dimensionName, values]) => {
      const dimension = dimensionMap.get(dimensionName);

      // Build IN condition using composer's format
      return where(`??dim::STRING IN (${values.map(() => '?').join(', ')})`, {
        dim: dimension?.name,
        ...values,
      });
    })
    .filter((c): c is QueryOperator => c !== null);

  if (query.length > 0) {
    const whereCommand = Walker.find(
      Parser.parse(query).root,
      (node) => node.type === 'command' && node.name === 'where'
    );

    if (whereCommand) {
      filterConditions.push(append({ command: BasicPrettyPrinter.print(whereCommand) }));
    }
  }

  return filterConditions;
}

function buildEsqlQuery(metricField: MetricField, filterConditions: QueryOperator[]): string {
  const { name: field, index } = metricField;

  const source = fromCommand([index]);

  const query = source.pipe(
    where(`??metricField IS NOT NULL`, { metricField: field }),
    ...filterConditions,
    limit(1)
  );

  return query.toString();
}

async function executeEsqlQueriesForChunk(
  esClient: TracedElasticsearchClient,
  metricFields: MetricField[],
  from: number,
  to: number,
  filterConditions: QueryOperator[],
  logger: Logger
): Promise<EsqlQueryResult[]> {
  // Build filter once for all queries in this chunk
  const dateRangeFilter = {
    bool: {
      filter: dateRangeQuery(from, to),
    },
  };

  const executeQuery = async (metricField: MetricField): Promise<EsqlQueryResult> => {
    try {
      const query = buildEsqlQuery(metricField, filterConditions);
      const response = await esClient.esql('sample_metrics_documents', {
        query,
        filter: dateRangeFilter,
      });

      return {
        metricField,
        columns: response.columns.map((column) => column.name),
        values: response.values,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.warn(`Error executing ES|QL query for metric ${metricField.name}: ${errorMessage}`);

      return {
        metricField,
        columns: [],
        values: [],
        error: error instanceof Error ? error : new Error(errorMessage),
      };
    }
  };

  return Promise.all(metricFields.map(executeQuery));
}

export async function sampleMetricMetadata({
  esClient,
  metricFields,
  logger,
  timerange: { from, to },
  filters,
  query = '',
}: {
  esClient: TracedElasticsearchClient;
  metricFields: MetricField[];
  logger: Logger;
  timerange: EpochTimeRange;
  filters: DimensionFilters;
  query?: string;
}): Promise<MetricMetadataMap> {
  if (metricFields.length === 0) {
    return new Map();
  }

  const filterEntries = Object.entries(filters);

  try {
    // Build filter conditions once, as they're the same for all queries
    const filterConditions =
      filterEntries.length > 0 || query.length > 0
        ? buildFilterConditions(filterEntries, metricFields[0]?.dimensions || [], query)
        : [];

    logger.debug(
      `Executing ${metricFields.length} ES|QL queries in batches of ${FIELDS_PER_BATCH} with ${MAX_CONCURRENT_REQUESTS} concurrent batches`
    );

    const limiter = pLimit(MAX_CONCURRENT_REQUESTS);
    const metricFieldChunks = chunk(metricFields, FIELDS_PER_BATCH);

    const batchResults = await Promise.allSettled(
      metricFieldChunks.map((metricFieldChunk) =>
        limiter(() =>
          executeEsqlQueriesForChunk(esClient, metricFieldChunk, from, to, filterConditions, logger)
        )
      )
    );

    // Flatten results from all batches
    const results = batchResults
      .filter((result): result is PromiseFulfilledResult<EsqlQueryResult[]> => {
        return result.status === 'fulfilled';
      })
      .flatMap((result) => result.value);

    return buildMetricMetadataMapFromEsql(results, logger);
  } catch (error) {
    logger.error(
      `Error sampling metric metadata: ${error instanceof Error ? error.message : String(error)}`
    );
    const metricMetadataMap: MetricMetadataMap = new Map();

    for (const { name, index } of metricFields) {
      metricMetadataMap.set(generateMapKey(index, name), { dimensions: [], totalHits: 0 });
    }
    return metricMetadataMap;
  }
}

export async function enrichMetricFields({
  esClient,
  metricFields,
  indexFieldCapsMap,
  logger,
  timerange,
  filters = {},
  query,
}: {
  esClient: TracedElasticsearchClient;
  metricFields: MetricField[];
  indexFieldCapsMap: IndexFieldCapsMap;
  logger: Logger;
  timerange: EpochTimeRange;
  filters?: DimensionFilters;
  query?: string;
}): Promise<MetricField[]> {
  if (metricFields.length === 0) {
    return metricFields;
  }

  const metricMetadataMap = await sampleMetricMetadata({
    esClient,
    metricFields,
    logger,
    timerange,
    filters,
    query,
  });

  const uniqueDimensionSets = new Map<string, Array<Dimension>>();

  return metricFields.map((field) => {
    const { dimensions, unitFromSample, totalHits } =
      metricMetadataMap.get(generateMapKey(field.index, field.name)) || {};
    const fieldCaps = indexFieldCapsMap.get(field.index);

    if ((!dimensions || dimensions.length === 0) && totalHits === 0) {
      return { ...field, dimensions: [], noData: true };
    }

    const cacheKey = dimensions ? [...(dimensions || [])].sort().join(',') : undefined;
    if (cacheKey && !uniqueDimensionSets.has(cacheKey) && fieldCaps) {
      uniqueDimensionSets.set(cacheKey, extractDimensions(fieldCaps, dimensions));
    }

    return {
      ...field,
      dimensions: cacheKey ? uniqueDimensionSets.get(cacheKey) ?? [] : [],
      noData: false,
      unit: normalizeUnit({ fieldName: field.name, unit: field.unit ?? unitFromSample }),
    };
  });
}
