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
import { EsqlFunctionNames } from '@kbn/esql-language/src/commands/definitions/generated/function_names';
import { isLegacyHistogram } from '../legacy_histogram';
import { resolveConflictingFieldTypes } from './resolve_conflicting_field_types';

/**
 * Gets the appropriate casting function name for a field type.
 * @param fieldType - The target field type
 * @returns The TO_* function name (e.g., 'TO_DOUBLE', 'TO_LONG'), or undefined if no cast is needed
 */
function getCastFunctionForType(fieldType: ES_FIELD_TYPES | undefined): string | undefined {
  switch (fieldType) {
    case 'double':
      return EsqlFunctionNames.TO_DOUBLE;
    case 'long':
      return EsqlFunctionNames.TO_LONG;
    default:
      return undefined;
  }
}

/**
 * Builds an ES|QL aggregation expression AST node using `synth.exp` template
 * literals. Accepts any expression node -- a resolved column (`synth.col`) or
 * an unresolved placeholder (`synth.dpar`) -- and wraps it in the correct
 * aggregation function based on the field type and instrument.
 *
 * When multiple field types are present (from fieldTypes array), applies casting
 * to resolve the ambiguity if the types are compatible.
 */
function buildAggregationNode(
  types: ES_FIELD_TYPES[],
  instrument: MappingTimeSeriesMetricType,
  field: ESQLAstExpression,
  customFunction?: string
): ESQLAstExpression | undefined {
  const primaryType = types[0];

  // If we have multiple types, resolve and apply casting if needed
  let castedField = field;
  if (types.length > 1) {
    const resolvedType = resolveConflictingFieldTypes(types);
    if (resolvedType) {
      const castFunction = getCastFunctionForType(resolvedType);
      if (castFunction) {
        castedField = synth.exp`${synth.kwd(castFunction)}(${field})`;
      }
    } else if (new Set(types).size > 1) {
      // Incompatible types (e.g., keyword + double) — return undefined
      // so callers can gracefully produce a no-op instead of a broken query.
      // When resolvedType is undefined but all types are the same (duplicates),
      // no cast is needed and we proceed normally.
      return undefined;
    }
  }

  if (customFunction) {
    return synth.exp`${synth.kwd(customFunction)}(${castedField})`;
  }
  if (isLegacyHistogram(primaryType, instrument)) {
    return synth.exp`PERCENTILE(TO_TDIGEST(${castedField}), ${95})`;
  }
  if (primaryType === 'exponential_histogram' || primaryType === 'tdigest') {
    return synth.exp`PERCENTILE(${castedField}, ${95})`;
  }
  if (instrument === 'counter') {
    return synth.exp`SUM(RATE(${castedField}))`;
  }
  return synth.exp`AVG(${castedField})`;
}

/**
 * Creates the metric aggregation part of an ES|QL query.
 * It returns:
 * - For legacy histogram (field type + instrument both histogram): `PERCENTILE(TO_TDIGEST(...), 95)`
 * - For `histogram` instrument: `PERCENTILE(..., 95)` if type is `exponential_histogram` or `tdigest`
 * - `SUM(RATE(...))` for counter instruments
 * - `AVG(...)` for other metric types
 *
 * When multiple field types are present (from different backing indices with conflicting mappings),
 * the aggregation will wrap the field in an appropriate casting function (e.g., TO_DOUBLE) to resolve the ambiguity.
 *
 * When `metricName` is provided the column is resolved and properly escaped.
 * Otherwise a `??placeholderName` parameter placeholder is emitted.
 *
 * @param types - The ES field types array (for conflicting mappings across backing indices).
 * @param instrument - The metric instrument type (e.g., 'counter', 'histogram', 'gauge').
 * @param metricName - The actual name of the metric field to aggregate.
 * @param placeholderName - The name of the placeholder to use in the template.
 * @param customFunction - Optional custom aggregation function to use for default case.
 * @returns The ES|QL aggregation string.
 */
export function createMetricAggregation({
  types,
  instrument,
  metricName,
  placeholderName = 'metricName',
  customFunction,
}: {
  types: ES_FIELD_TYPES[];
  instrument: MappingTimeSeriesMetricType;
  metricName?: string;
  placeholderName?: string;
  customFunction?: string;
}): string {
  const field = metricName ? synth.col(metricName.split('.')) : synth.dpar(placeholderName);
  const node = buildAggregationNode(types, instrument, field, customFunction);
  if (!node) {
    return '';
  }
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
