/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { esql } from '@elastic/esql';
import { isSingleSource, sanitazeESQLInput } from '@kbn/esql-utils';
import { EXEMPLARS_PER_BUCKET, METRICS_CHART_TARGET_BUCKETS } from '../../constants';
import { deriveExemplarsIndex } from '../exemplars/derive_exemplars_index';
import type { ParsedMetricItem } from '../../../types';

/** Column holding the exemplar timestamp. Also the sort and time-filter field. */
const TIMESTAMP_FIELD = '@timestamp';
/**
 * Trace correlation columns. `trace_id` and `span_id` are mapped to ECS-compliant
 * equivalents `trace.id` and `span.id`, but referencing the native field names skips
 * this alias resolution.
 */
const TRACE_ID_FIELD = 'trace_id';
const SPAN_ID_FIELD = 'span_id';

/**
 * Which exemplars survive within each time bucket. `newest` keeps the most recent ones,
 * `highest` keeps the largest metric values (e.g. the slowest requests for a latency metric).
 */
export type ExemplarsOrderBy = 'newest' | 'highest';

interface CreateExemplarsQueryParams {
  metricItem: ParsedMetricItem;
  /**
   * Verbatim ES|QL fragments from the user's own `WHERE` commands, re-piped so
   * the exemplars include the same dimension filters as the metric chart.
   */
  whereStatements?: string[];
  /**
   * The source the user typed in their query. Resolved with the same precedence as
   * {@link createESQLQuery}, so the exemplars scope matches the chart's scope.
   */
  originalSource?: string;
  /** Exemplars kept per time bucket. */
  perBucket?: number;
  /** Number of time buckets across the window. Should match the metric chart's `TBUCKET`. */
  targetBuckets?: number;
  orderBy?: ExemplarsOrderBy;
}

/**
 * Builds the ES|QL query that fetches OTLP exemplars for a single metric, or returns
 * an empty string when the metric cannot have exemplars (callers treat `''` as
 * "do not fetch").
 *
 * The time range is not written into the query: the Lens `esql` expression function
 * pushes the host time range down as a filter and binds `?_tstart` / `?_tend`, so the
 * exemplar buckets track the chart's axis in Discover and in Dashboards alike.
 *
 * Deliberately takes no breakdown accessors: breaking down the metric chart by a
 * dimension must not change which exemplars are fetched.
 */
export function createExemplarsQuery({
  metricItem,
  whereStatements = [],
  originalSource,
  perBucket = EXEMPLARS_PER_BUCKET,
  targetBuckets = METRICS_CHART_TARGET_BUCKETS,
  orderBy = 'newest',
}: CreateExemplarsQueryParams): string {
  const { metricName, indexName, dimensionFields } = metricItem;
  const metricsIndex = isSingleSource(originalSource) ? originalSource : indexName;
  const exemplarsIndex = deriveExemplarsIndex(metricsIndex);

  if (!exemplarsIndex || !metricName) {
    return '';
  }

  // TODO(elasticsearch#154786): swap `FROM <index>` for `TS_EXEMPLARS` when available.
  const query = esql.from(exemplarsIndex);
  const escapedMetricName = sanitazeESQLInput(metricName);

  // Rows where the metric column is null belong to a different metric in the same
  // exemplars stream.
  query.pipe(`WHERE ${escapedMetricName} IS NOT NULL`);

  for (const statement of whereStatements) {
    const trimmed = statement.trim();
    if (trimmed.length > 0) {
      query.pipe(`WHERE ${trimmed}`);
    }
  }

  // The sort decides which rows `LIMIT ... BY` keeps in each bucket. `span_id` breaks ties
  // so the same window always yields the same exemplars across refreshes.
  const sortKeys =
    orderBy === 'highest'
      ? [`${escapedMetricName} DESC`, `${TIMESTAMP_FIELD} DESC`, `${SPAN_ID_FIELD} ASC`]
      : [`${TIMESTAMP_FIELD} DESC`, `${SPAN_ID_FIELD} ASC`];
  query.pipe(`SORT ${sortKeys.join(', ')}`);
  query.pipe(
    `LIMIT ${perBucket} BY BUCKET(${TIMESTAMP_FIELD}, ${targetBuckets}, ?_tstart, ?_tend)`
  );
  // `LIMIT ... BY` does not count as the query's row limit: without an explicit one ES|QL
  // adds an implicit `LIMIT 1000` plus a warning header and would silently truncate a
  // larger per-bucket budget. State the ceiling the per-bucket limit already implies.
  query.pipe(`LIMIT ${perBucket * targetBuckets}`);

  const baseColumns = [TIMESTAMP_FIELD, metricName, TRACE_ID_FIELD, SPAN_ID_FIELD];
  const keepColumns = [
    TIMESTAMP_FIELD,
    escapedMetricName,
    TRACE_ID_FIELD,
    SPAN_ID_FIELD,
    ...dimensionFields
      .filter(({ name }) => !baseColumns.includes(name))
      .map(({ name }) => sanitazeESQLInput(name)),
  ];
  query.pipe(`KEEP ${keepColumns.join(', ')}`);

  return query.print('pipe-multiline');
}
