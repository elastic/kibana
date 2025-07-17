/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SavedObjectsFieldMapping } from '@kbn/core-saved-objects-server';

const NUMERIC_TYPES = [
  'long',
  'integer',
  'short',
  'byte',
  'double',
  'float',
  'half_float',
  'scaled_float',
] as const;

const NUMERIC_TYPES_SET = new Set(NUMERIC_TYPES);

// List of sortable types in Elasticsearch (numeric, date, keyword, boolean)
const SORTABLE_TYPES = new Set([...NUMERIC_TYPES, 'date', 'keyword', 'boolean']);

/**
 * Returns true if the field mapping is directly sortable in Elasticsearch.
 * Only keyword, numeric, date, and boolean field types are considered sortable.
 *
 * Text fields are NOT considered sortable, even if we could easily use the
 * runtime field to map them to a keyword. When text fields have a keyword
 * subfield, users must explicitly specify the keyword subfield
 * (e.g., 'title.keyword').
 * This ensures consistent behavior across single and multi-type queries.
 */
export const isValidSortingField = (fieldMapping?: SavedObjectsFieldMapping): boolean => {
  if (!fieldMapping) return false;
  return !!(fieldMapping.type && SORTABLE_TYPES.has(fieldMapping.type));
};

/**
 * Returns the name of the keyword subfield if present in a text field mapping.
 */
export const getKeywordField = (fieldMapping?: SavedObjectsFieldMapping): string | undefined => {
  if (fieldMapping?.type === 'text' && fieldMapping.fields) {
    return Object.entries(fieldMapping.fields).find(
      ([, subField]) => subField?.type === 'keyword'
    )?.[0];
  }
  return undefined;
};

/**
 * Validates that all normalized field types are compatible for sorting.
 * Returns a discriminated union indicating validity and conflicting types if any.
 */
export function validateFieldTypeCompatibility(
  normalizedTypes: string[]
): { isValid: true } | { isValid: false; conflictingTypes: string[] } {
  const uniqueTypes = Array.from(new Set(normalizedTypes));
  if (uniqueTypes.length > 1) {
    return {
      isValid: false,
      conflictingTypes: uniqueTypes,
    };
  }
  return { isValid: true };
}

/**
 * Normalizes numeric field types to 'double' to ensure sorting compatibility.
 * Other types remain unchanged.
 */
export function normalizeNumericTypes(fieldMapping: SavedObjectsFieldMapping): string {
  if (!fieldMapping.type) {
    throw new Error('Field mapping is missing required type property');
  }

  if (NUMERIC_TYPES_SET.has(fieldMapping.type as (typeof NUMERIC_TYPES)[number])) {
    return 'double';
  }

  return fieldMapping.type;
}
