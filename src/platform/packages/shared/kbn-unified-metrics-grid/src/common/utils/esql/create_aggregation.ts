/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { timeseries, stats } from '@kbn/esql-composer';
import type { MetricField } from '@kbn/metrics-experience-plugin/common/types';

type Params = Record<string, string | number | boolean | null>;

/**
 * Takes an ES|QL function string with placeholders and a parameters object,
 * and returns the function string with the placeholders substituted and correctly escaped.
 *
 * This function works by using the `@kbn/esql-composer` to build a temporary query,
 * which handles the AST substitution and escaping internally.
 *
 * @param functionString An ES|QL function string with placeholders (e.g., "AVG(??metricField)").
 * @param params A parameters object (e.g., { metricField: 'system.load.1m' }).
 * @returns The transformed function string (e.g., "AVG(system.load.`1m`)").
 */
export function replaceFunctionParams(functionString: string, params: Params): string {
  // 1. Use the esql-composer to build a query. This handles all the AST work internally.
  const fullQueryString = timeseries('metrics-*').pipe(stats(functionString, params)).toString();

  // 2. Extract the function part from the generated query string.
  // The output will be "TS metrics-*\n  | STATS AVG(system.load.`1m`)"
  const statsPrefix = '| STATS ';
  const lines = fullQueryString.split('\n');
  const statsLine = lines.find((line) => line.trim().startsWith(statsPrefix));

  if (statsLine) {
    return statsLine.trim().substring(statsPrefix.length);
  }

  // Fallback in case the output format changes unexpectedly.
  return functionString;
}

/**
 * Creates the metric aggregation part of an ES|QL query.
 * It returns `SUM(RATE(...))` for counters and `AVG(...)` for other metric types.
 * If a metric name is provided, it will be properly escaped and substituted.
 *
 * @param instrument - The type of metric instrument (e.g., 'counter').
 * @param metricName - The actual name of the metric field to aggregate.
 * @param placeholderName - The name of the placeholder to use in the template.
 * @returns The ES|QL aggregation string.
 */
export function createMetricAggregation({
  instrument,
  metricName,
  placeholderName = 'metricName',
}: {
  instrument: MetricField['instrument'];
  metricName?: string;
  placeholderName?: string;
}) {
  const functionTemplate =
    instrument === 'counter' ? `SUM(RATE(??${placeholderName}))` : `AVG(??${placeholderName})`;
  return metricName
    ? replaceFunctionParams(functionTemplate, { [placeholderName]: metricName })
    : functionTemplate;
}

/**
 * Creates the time bucketing part of an ES|QL query.
 *
 * @param targetBuckets - The desired number of buckets for the time series.
 * @param timestampField - The name of the timestamp field.
 * @param escapePlaceHolders - Whether to use escaped placeholders for start and end times.
 * @returns The ES|QL BUCKET function string.
 */
export function createTimeBucketAggregation({
  targetBuckets = 100,
  timestampField = '@timestamp',
  escapePlaceHolders = true,
}: {
  targetBuckets?: number;
  timestampField?: string;
  escapePlaceHolders?: boolean;
}) {
  const startPlaceholder = escapePlaceHolders ? '?_tstart' : '?_tstart';
  const endPlaceholder = escapePlaceHolders ? '?_tend' : '?_tend';
  return `BUCKET(${timestampField}, ${targetBuckets}, ${startPlaceholder}, ${endPlaceholder})`;
}
