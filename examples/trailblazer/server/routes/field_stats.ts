/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import type { ElasticsearchClient, IRouter } from '@kbn/core/server';
import type {
  AggregationsAutoDateHistogramAggregate,
  AggregationsBuckets,
  AggregationsHistogramAggregate,
  AggregationsMissingAggregate,
  AggregationsStatsAggregate,
  AggregationsStringTermsAggregate,
  QueryDslQueryContainer,
  SearchTotalHits,
} from '@elastic/elasticsearch/lib/api/types';
import type { FieldStatsBucket, FieldStatsResponse } from '../../common';
import {
  DATE_FIELD_TYPES,
  FIELD_STATS_ROUTE,
  MAX_NAME_LENGTH,
  MAX_QUERY_LENGTH,
  NUMERIC_FIELD_TYPES,
} from '../../common';
import { buildQuery } from '../lib/build_query';
import { toErrorResponse } from '../lib/error_response';
import {
  expandWildcards,
  includeHiddenSchema,
  queryLanguageSchema,
  routeSecurity,
} from '../lib/route_config';

const DATE_BUCKETS = 40;
const HISTOGRAM_BUCKETS = 20;
const TERMS_SIZE = 20;
const INTEGER_TYPES: readonly string[] = ['long', 'integer', 'short', 'byte', 'unsigned_long'];

const INTERVAL_UNIT_MS: Readonly<Record<string, number>> = {
  ms: 1,
  s: 1_000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
  w: 604_800_000,
  M: 2_592_000_000,
  y: 31_536_000_000,
};

interface StatsTarget {
  readonly esClient: ElasticsearchClient;
  readonly index: string;
  readonly query: QueryDslQueryContainer;
  readonly field: string;
  readonly includeHidden: boolean;
}

export function registerFieldStatsRoute(router: IRouter) {
  router.post(
    {
      path: FIELD_STATS_ROUTE,
      security: routeSecurity,
      validate: {
        body: schema.object({
          index: schema.string({ minLength: 1, maxLength: MAX_NAME_LENGTH }),
          includeHidden: includeHiddenSchema,
          language: queryLanguageSchema,
          query: schema.string({ defaultValue: '', maxLength: MAX_QUERY_LENGTH }),
          field: schema.string({ minLength: 1, maxLength: MAX_NAME_LENGTH }),
          fieldType: schema.string({ minLength: 1, maxLength: 100 }),
        }),
      },
    },
    async (context, request, response) => {
      const { index, includeHidden, language, query, field, fieldType } = request.body;
      const esClient = (await context.core).elasticsearch.client.asCurrentUser;

      try {
        const target: StatsTarget = {
          esClient,
          index,
          query: buildQuery(language, query),
          field,
          includeHidden,
        };
        const body = DATE_FIELD_TYPES.includes(fieldType)
          ? await dateStats(target)
          : NUMERIC_FIELD_TYPES.includes(fieldType)
          ? await numericStats(target, INTEGER_TYPES.includes(fieldType))
          : await termsStats(target);
        return response.ok({ body });
      } catch (error) {
        return toErrorResponse(response, error);
      }
    }
  );
}

async function dateStats({ esClient, index, query, field, includeHidden }: StatsTarget) {
  const result = await esClient.search<
    never,
    { values: AggregationsAutoDateHistogramAggregate; missing: AggregationsMissingAggregate }
  >({
    index,
    query,
    size: 0,
    track_total_hits: true,
    ignore_unavailable: true,
    expand_wildcards: expandWildcards(includeHidden),
    aggs: {
      values: { auto_date_histogram: { field, buckets: DATE_BUCKETS } },
      missing: { missing: { field } },
    },
  });

  const { aggregations } = result;
  const raw = toArray(aggregations?.values.buckets);
  const intervalMs = parseIntervalMs(aggregations?.values.interval);

  const buckets: FieldStatsBucket[] = raw.map((bucket, i) => {
    const from = Number(bucket.key);
    const next = raw[i + 1];
    const to = next ? Number(next.key) : intervalMs ? from + intervalMs : undefined;
    return {
      key: new Date(from).toISOString(),
      label: new Date(from).toISOString(),
      count: bucket.doc_count,
      ...(to !== undefined ? { to: new Date(to).toISOString() } : {}),
    };
  });

  return toResponse('date', result.hits.total, aggregations?.missing, buckets);
}

async function numericStats(
  { esClient, index, query, field, includeHidden }: StatsTarget,
  isInteger: boolean
): Promise<FieldStatsResponse> {
  const statsResult = await esClient.search<
    never,
    { stats: AggregationsStatsAggregate; missing: AggregationsMissingAggregate }
  >({
    index,
    query,
    size: 0,
    track_total_hits: true,
    ignore_unavailable: true,
    expand_wildcards: expandWildcards(includeHidden),
    aggs: { stats: { stats: { field } }, missing: { missing: { field } } },
  });

  const stats = statsResult.aggregations?.stats;
  const missing = statsResult.aggregations?.missing;
  if (!stats || stats.count === 0 || stats.min === null || stats.max === null) {
    return toResponse('histogram', statsResult.hits.total, missing, []);
  }

  const { min, max } = stats;
  const span = (max - min) / HISTOGRAM_BUCKETS;
  const interval = isInteger ? Math.max(1, Math.ceil(span)) : span > 0 ? span : 1;

  const histogramResult = await esClient.search<never, { values: AggregationsHistogramAggregate }>({
    index,
    query,
    size: 0,
    ignore_unavailable: true,
    expand_wildcards: expandWildcards(includeHidden),
    aggs: {
      values: {
        histogram: { field, interval, min_doc_count: 0, extended_bounds: { min, max } },
      },
    },
  });

  const buckets: FieldStatsBucket[] = toArray(histogramResult.aggregations?.values.buckets).map(
    (bucket) => ({
      key: bucket.key,
      label: formatNumber(bucket.key),
      count: bucket.doc_count,
      to: bucket.key + interval,
    })
  );

  return toResponse('histogram', statsResult.hits.total, missing, buckets);
}

async function termsStats({ esClient, index, query, field, includeHidden }: StatsTarget) {
  const result = await esClient.search<
    never,
    { values: AggregationsStringTermsAggregate; missing: AggregationsMissingAggregate }
  >({
    index,
    query,
    size: 0,
    track_total_hits: true,
    ignore_unavailable: true,
    expand_wildcards: expandWildcards(includeHidden),
    aggs: {
      values: { terms: { field, size: TERMS_SIZE } },
      missing: { missing: { field } },
    },
  });

  const buckets: FieldStatsBucket[] = toArray(result.aggregations?.values.buckets).map((bucket) => {
    const { key_as_string: keyAsString } = bucket;
    const key = typeof keyAsString === 'string' ? keyAsString : String(bucket.key);
    return { key, label: key, count: bucket.doc_count };
  });

  return toResponse('terms', result.hits.total, result.aggregations?.missing, buckets);
}

function toResponse(
  kind: FieldStatsResponse['kind'],
  total: SearchTotalHits | number | undefined,
  missing: AggregationsMissingAggregate | undefined,
  buckets: FieldStatsBucket[]
): FieldStatsResponse {
  return {
    kind,
    totalDocs: typeof total === 'number' ? total : total?.value ?? 0,
    missingDocs: missing?.doc_count ?? 0,
    buckets,
  };
}

function toArray<T>(buckets: AggregationsBuckets<T> | undefined): T[] {
  if (!buckets) return [];
  return Array.isArray(buckets) ? buckets : Object.values(buckets);
}

function parseIntervalMs(interval: string | undefined): number | undefined {
  const match = interval?.match(/^(\d+)(ms|s|m|h|d|w|M|y)$/);
  if (!match) return undefined;
  const [, amount, unit] = match;
  return Number(amount) * INTERVAL_UNIT_MS[unit];
}

function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toPrecision(6);
}
