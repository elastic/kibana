/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ES_FIELD_TYPES } from '@kbn/field-types';

// Numeric type families for auto-casting precedence
const FLOAT_FAMILY = ['float', 'half_float', 'scaled_float'];
const INT_FAMILY = ['integer', 'short', 'byte'];
const ALL_NUMERIC = ['double', ...FLOAT_FAMILY, 'long', ...INT_FAMILY];

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

  // Check if all types are in the float family (double is the widest)
  if (uniqueTypes.every((type) => type === 'double' || FLOAT_FAMILY.includes(type as string))) {
    return ES_FIELD_TYPES.DOUBLE;
  }

  // Check if all types are in the integer family (long is the widest)
  if (uniqueTypes.every((type) => type === 'long' || INT_FAMILY.includes(type as string))) {
    return ES_FIELD_TYPES.LONG;
  }

  // Mixed numeric: if all types are numeric, prefer double
  if (uniqueTypes.every((type) => ALL_NUMERIC.includes(type as string))) {
    return ES_FIELD_TYPES.DOUBLE;
  }

  // Incompatible types (e.g., keyword + double, text + long)
  return undefined;
}
