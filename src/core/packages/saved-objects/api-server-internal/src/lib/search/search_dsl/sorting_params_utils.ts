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
 * Returns true if the field mapping is sortable in Elasticsearch.
 * Only keyword, numeric, date, boolean, and similar types are sortable.
 * Text fields are not sortable unless they have keyword subfields.
 *
 * IMPORTANT: We explicitly reject text fields without keyword subfields to prevent
 * dangerous inconsistencies in sorting behavior:
 *
 * - Single-type sorting on text without keyword subfield: Would fail at query time
 *   because Elasticsearch cannot sort directly on analyzed text fields
 *
 * - Multi-type sorting on text without keyword subfield: Could theoretically work
 *   using runtime fields that emit keyword values from text sources, but this would
 *   create inconsistent behavior where the same field is sortable in some contexts
 *   but not others
 *
 * This inconsistency would be confusing and error-prone for users. Instead, we require
 * explicit keyword subfields for all sortable text fields, ensuring consistent behavior
 * across all sorting scenarios.
 */
export const isValidSortingField = (fieldMapping?: SavedObjectsFieldMapping): boolean => {
  if (!fieldMapping) return false;
  if (fieldMapping.type && SORTABLE_TYPES.has(fieldMapping.type)) return true;
  // text fields are not sortable, but text with keyword subfield is (via the subfield)
  return (
    fieldMapping.type === 'text' &&
    !!fieldMapping.fields &&
    Object.values(fieldMapping.fields).some((subField) => subField?.type === 'keyword')
  );
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
 * Normalizes a field mapping to its canonical type for comparison.
 * - All numeric types are normalized to 'double'
 * - Text fields with keyword subfields are normalized to 'keyword'
 * - Other types remain unchanged
 */
export function normalizeFieldType(fieldMapping: SavedObjectsFieldMapping): string {
  if (!fieldMapping.type) {
    throw new Error('Field mapping is missing required type property');
  }

  if (NUMERIC_TYPES_SET.has(fieldMapping.type as (typeof NUMERIC_TYPES)[number])) {
    return 'double';
  }

  // If text field has a keyword subfield, treat as keyword for sorting
  if (
    fieldMapping.type === 'text' &&
    fieldMapping.fields &&
    Object.values(fieldMapping.fields).some((sub) => sub?.type === 'keyword')
  ) {
    return 'keyword';
  }

  return fieldMapping.type;
}
