/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { MappingTimeSeriesMetricType } from '@elastic/elasticsearch/lib/api/types';
import { synth, BasicPrettyPrinter } from '@elastic/esql';
import type { ESQLAstExpression } from '@elastic/esql/types';
import type { ES_FIELD_TYPES } from '@kbn/field-types';
import { isLegacyHistogram } from '../legacy_histogram';

/**
 * Builds an ES|QL aggregation expression AST node using `synth.exp` template
 * literals. Accepts any expression node -- a resolved column (`synth.col`) or
 * an unresolved placeholder (`synth.dpar`) -- and wraps it in the correct
 * aggregation function based on the field type and instrument.
 */
function buildAggregationNode(
  type: ES_FIELD_TYPES,
  instrument: MappingTimeSeriesMetricType,
  field: ESQLAstExpression,
  customFunction?: string
) {
  if (customFunction) {
    return synth.exp`${synth.kwd(customFunction)}(${field})`;
  }
  if (isLegacyHistogram(type, instrument)) {
    return synth.exp`PERCENTILE(TO_TDIGEST(${field}), ${95})`;
  }
  if (type === 'exponential_histogram' || type === 'tdigest') {
    return synth.exp`PERCENTILE(${field}, ${95})`;
  }
  if (instrument === 'counter') {
    return synth.exp`SUM(RATE(${field}))`;
  }
  return synth.exp`AVG(${field})`;
}

/**
 * Creates the metric aggregation part of an ES|QL query.
 * It returns:
 * - For legacy histogram (field type + instrument both histogram): `PERCENTILE(TO_TDIGEST(...), 95)`
 * - For `histogram` instrument: `PERCENTILE(..., 95)` if type is `exponential_histogram` or `tdigest`
 * - `SUM(RATE(...))` for counter instruments
 * - `AVG(...)` for other metric types
 *
 * When `metricName` is provided the column is resolved and properly escaped.
 * Otherwise a `??placeholderName` parameter placeholder is emitted.
 *
 * @param type - The ES field type (e.g., 'histogram', 'exponential_histogram', 'tdigest').
 * @param instrument - The metric instrument type (e.g., 'counter', 'histogram', 'gauge').
 * @param metricName - The actual name of the metric field to aggregate.
 * @param placeholderName - The name of the placeholder to use in the template.
 * @param customFunction - Optional custom aggregation function to use for default case.
 * @returns The ES|QL aggregation string.
 */
export function createMetricAggregation({
  type,
  instrument,
  metricName,
  placeholderName = 'metricName',
  customFunction,
}: {
  type: ES_FIELD_TYPES;
  instrument: MappingTimeSeriesMetricType;
  metricName?: string;
  placeholderName?: string;
  customFunction?: string;
}): string {
  const field = metricName ? synth.col(metricName.split('.')) : synth.dpar(placeholderName);
  const node = buildAggregationNode(type, instrument, field, customFunction);
  return BasicPrettyPrinter.print(node).trim();
}

/**
 * Creates the time bucketing part of an ES|QL query.
 *
 * @param targetBuckets - The desired number of buckets for the time series.
 * @param timestampField - The name of the timestamp field.
 * @returns The ES|QL BUCKET function string.
 */
export function createTimeBucketAggregation({
  targetBuckets = 100,
  timestampField = '@timestamp',
}: {
  targetBuckets?: number;
  timestampField?: string;
}) {
  return `BUCKET(${timestampField}, ${targetBuckets}, ?_tstart, ?_tend)`;
}
