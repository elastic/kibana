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
import { ES_FIELD_TYPES } from '@kbn/field-types';
import { isLegacyHistogram } from '../legacy_histogram';

/**
 * Resolves conflicting field types to a single compatible type for casting.
 * When multiple field types are present (e.g., from different backing indices),
 * selects the widest compatible numeric type based on a precedence order.
 *
 * Precedence rules:
 * - double > float / half_float / scaled_float
 * - long > integer / short / byte
 * - double > long (mixed numeric types)
 *
 * @param fieldTypes - Array of field types (may contain duplicates or compatible types)
 * @returns The selected field type, or undefined if types are incompatible or non-numeric
 */
export function resolveConflictingFieldTypes(
  fieldTypes: ES_FIELD_TYPES[]
): ES_FIELD_TYPES | undefined {
  if (fieldTypes.length <= 1) {
    return fieldTypes[0];
  }

  // Filter out duplicates — no cast needed when all types are the same
  const uniqueTypes = Array.from(new Set(fieldTypes));
  if (uniqueTypes.length === 1) {
    return undefined;
  }

  // Numeric type precedence for auto-casting
  const FLOAT_FAMILY = ['float', 'half_float', 'scaled_float'];
  const INT_FAMILY = ['integer', 'short', 'byte'];

  // Check if all types are in the float family (double is the widest)
  if (uniqueTypes.every((type) => type === 'double' || FLOAT_FAMILY.includes(type as string))) {
    return ES_FIELD_TYPES.DOUBLE;
  }

  // Check if all types are in the integer family (long is the widest)
  if (uniqueTypes.every((type) => type === 'long' || INT_FAMILY.includes(type as string))) {
    return ES_FIELD_TYPES.LONG;
  }

  // Mixed numeric: if all types are numeric, prefer double
  const ALL_NUMERIC = ['double', ...FLOAT_FAMILY, 'long', ...INT_FAMILY];
  if (uniqueTypes.every((type) => ALL_NUMERIC.includes(type as string))) {
    return ES_FIELD_TYPES.DOUBLE;
  }

  // Incompatible types (e.g., keyword + double, text + long)
  return undefined;
}

/**
 * Gets the appropriate casting function name for a field type.
 * @param fieldType - The target field type
 * @returns The TO_* function name (e.g., 'TO_DOUBLE', 'TO_LONG'), or undefined if no cast is needed
 */
function getCastFunctionForType(fieldType: ES_FIELD_TYPES | undefined): string | undefined {
  switch (fieldType) {
    case 'double':
      return 'TO_DOUBLE';
    case 'long':
      return 'TO_LONG';
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
  types: ES_FIELD_TYPES | ES_FIELD_TYPES[],
  instrument: MappingTimeSeriesMetricType,
  field: ESQLAstExpression,
  customFunction?: string
) {
  // Normalize to array for consistent handling
  const fieldTypesArray = Array.isArray(types) ? types : [types];
  const primaryType = fieldTypesArray[0];

  // If we have multiple types, resolve and apply casting if needed
  let castedField = field;
  if (fieldTypesArray.length > 1) {
    const resolvedType = resolveConflictingFieldTypes(fieldTypesArray);
    if (resolvedType) {
      const castFunction = getCastFunctionForType(resolvedType);
      if (castFunction) {
        castedField = synth.exp`${synth.kwd(castFunction)}(${field})`;
      }
    }
    // If types are incompatible, we'll proceed with the primary type
    // and let the query execution surface the error to the user
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
 * @param type - The ES field type(s). Can be a single type or array of types (for conflicting mappings).
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
  type: ES_FIELD_TYPES | ES_FIELD_TYPES[];
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
