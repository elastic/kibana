/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { from, stats, timeseries, where } from '@kbn/esql-composer';
import { sanitazeESQLInput } from '@kbn/esql-utils';
import type { MetricField } from '../../../types';
import {
  createMetricAggregation,
  createTimeBucketAggregation,
  createM4Pipeline,
} from './create_aggregation';

interface CreateESQLQueryParams {
  metric: MetricField;
  splitAccessors?: string[];
  whereStatements?: string[];
  useFrom?: boolean;
  targetBuckets?: number;
}

/**
 * Creates a complete ESQL query string for metrics visualizations.
 * The function constructs a query that includes time series aggregation
 * and split accessors for dimension breakdowns.
 *
 * @param metric - The full metric field object, including dimension type information.
 * @param splitAccessors - An array of field names to use as split accessors in the BY clause.
 * @param whereStatements - Optional WHERE clause statements.
 * @param useFrom - If true, uses FROM instead of TS as the source command.
 * @param targetBuckets - The desired number of time buckets (defaults to 100).
 * @returns A complete ESQL query string.
 */
export function createESQLQuery({
  metric,
  splitAccessors = [],
  whereStatements = [],
  useFrom = false,
  targetBuckets,
}: CreateESQLQueryParams) {
  const { name: metricField, instrument, index, type } = metric;
  const source = useFrom ? from(index) : timeseries(index);

  const whereCommands = whereStatements.flatMap((statement) => {
    const trimmed = statement.trim();
    return trimmed.length > 0 ? [where(trimmed)] : [];
  });

  const queryPipeline = source.pipe(
    ...whereCommands,
    stats(
      `${createMetricAggregation({
        type,
        instrument,
        placeholderName: 'metricField',
      })} BY ${createTimeBucketAggregation({ targetBuckets })}${
        splitAccessors.length > 0
          ? `, ${splitAccessors.map((field) => sanitazeESQLInput(field)).join(',')}`
          : ''
      }`,
      {
        metricField,
      }
    )
  );

  return queryPipeline.toString();
}

interface CreateM4DownsampledESQLQueryParams {
  metric: MetricField;
  whereStatements?: string[];
  sourceBuckets?: number;
  targetBuckets?: number;
  timestampField?: string;
}

/**
 * Creates a two-stage ES|QL query: first aggregates (AVG/SUM(RATE)/etc.)
 * with fine-grained buckets, then applies M4 downsampling to the result.
 *
 * This produces visually identical output to the standard aggregation query
 * but with far fewer data points, demonstrating M4's compression efficiency.
 *
 * Stage 1: STATS <agg>(metric) BY BUCKET(@timestamp, sourceBuckets)  → ~sourceBuckets rows
 * Stage 2: M4 downsample to targetBuckets                            → ~targetBuckets*4 rows
 *
 * @param metric - The metric field to aggregate and downsample.
 * @param whereStatements - Optional WHERE clause statements.
 * @param sourceBuckets - Fine-grained bucket count for the initial aggregation (defaults to 1000).
 * @param targetBuckets - M4 bucket count for downsampling (defaults to 100).
 * @param timestampField - The timestamp field name (defaults to '@timestamp').
 * @returns A complete ES|QL query string.
 */
export function createM4DownsampledESQLQuery({
  metric,
  whereStatements = [],
  sourceBuckets = 1000,
  targetBuckets = 100,
  timestampField = '@timestamp',
}: CreateM4DownsampledESQLQueryParams): string {
  const { name: metricField, instrument, index, type } = metric;
  const source = from(index);

  const whereCommands = whereStatements.flatMap((statement) => {
    const trimmed = statement.trim();
    return trimmed.length > 0 ? [where(trimmed)] : [];
  });

  const basePipeline = whereCommands.length > 0 ? source.pipe(...whereCommands) : source;

  const aggFunction = createMetricAggregation({
    type,
    instrument,
    metricName: metricField,
  });

  const firstStage = `STATS agg_val = ${aggFunction} BY _ts = BUCKET(${timestampField}, ${sourceBuckets}, ?_tstart, ?_tend)`;

  const m4Stage = createM4Pipeline({
    metricField: 'agg_val',
    targetBuckets,
    timestampField: '_ts',
    outputTimestampField: timestampField,
  });

  return `${basePipeline.toString()}\n  | ${firstStage}\n  | ${m4Stage}`;
}
