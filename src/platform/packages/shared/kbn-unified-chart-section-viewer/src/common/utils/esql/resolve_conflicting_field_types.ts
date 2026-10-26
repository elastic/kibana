/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ES_FIELD_TYPES } from '@kbn/field-types';

// Numeric type families for auto-casting precedence.
// `counter_double` and `counter_long` are TSDB counter variants that live alongside
// their non-counter counterparts in backing indices after rollover or reindex.
// ES|QL can cast them via TO_DOUBLE / TO_LONG so they coexist with `double` / `long`.
const DOUBLE_FAMILY: readonly string[] = [
  'double',
  'float',
  'half_float',
  'scaled_float',
  'counter_double',
];
const LONG_FAMILY: readonly string[] = ['long', 'integer', 'short', 'byte', 'counter_long'];
const ALL_NUMERIC: readonly string[] = [...DOUBLE_FAMILY, ...LONG_FAMILY];

const isDoubleFamily = (type: string): boolean => DOUBLE_FAMILY.includes(type);
const isLongFamily = (type: string): boolean => LONG_FAMILY.includes(type);
const isNumeric = (type: string): boolean => ALL_NUMERIC.includes(type);

/**
 * Resolves conflicting field types to a single compatible type for casting.
 * When multiple field types are present (e.g., from different backing indices),
 * selects the widest compatible numeric type based on a precedence order.
 *
 * Precedence rules:
 * - double > float / half_float / scaled_float
 * - long > integer / short / byte
 * - double > long (mixed numeric types)
 * - counter_double combines with any float/double family member as double
 * - counter_long combines with any integer/long family member as long
 * - counter_* combined with a non-matching numeric family widens to double
 *
 * Histogram-class types (histogram, exponential_histogram, tdigest) are intentionally
 * not resolved here: ES|QL has no safe cast between them and the caller passes the
 * field through uncast so the resulting ES verification_exception surfaces to Lens.
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

  // Filter out duplicates, no cast needed when all types are the same
  const uniqueTypes = Array.from(new Set(fieldTypes));
  if (uniqueTypes.length === 1) {
    return undefined;
  }

  // Check if all types are in the float family, including counter_double (double is the widest)
  if (uniqueTypes.every(isDoubleFamily)) {
    return ES_FIELD_TYPES.DOUBLE;
  }

  // Check if all types are in the integer family, including counter_long (long is the widest)
  if (uniqueTypes.every(isLongFamily)) {
    return ES_FIELD_TYPES.LONG;
  }

  // Mixed numeric: if all types are numeric (including counter_*), prefer double
  if (uniqueTypes.every(isNumeric)) {
    return ES_FIELD_TYPES.DOUBLE;
  }

  // Incompatible types (e.g., keyword + double, text + long, histogram + counter_long)
  return undefined;
}
