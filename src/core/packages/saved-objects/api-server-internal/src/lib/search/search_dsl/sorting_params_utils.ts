/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SavedObjectsFieldMapping } from '@kbn/core-saved-objects-server';
import { MappingRuntimeFieldType } from '@elastic/elasticsearch/lib/api/types';

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
 * Text fields are not sortable.
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
 * Validates that all field mappings have the same type.
 * Throws an error if types are not the same, except all numeric types are considered equivalent.
 */
export function validateSameFieldTypeForAllTypes(
  sortField: string,
  fieldMappings: SavedObjectsFieldMapping[]
): void {
  const fieldTypes = fieldMappings.map((fm) => fm.type);
  const uniqueTypes = Array.from(new Set(fieldTypes));
  // If all types are numeric, allow
  if (uniqueTypes.every((t) => NUMERIC_TYPES.includes(t as (typeof NUMERIC_TYPES)[number]))) {
    return;
  }
  if (uniqueTypes.length > 1) {
    throw new Error(
      `Sort field "${sortField}" has different mapping types across types: [${uniqueTypes.join(
        ', '
      )}]. Sorting requires the field to have the same type in all types (numeric types are considered equivalent).`
    );
  }
}

/**
 * Helper to determine the merged type for runtime field.
 * Maps unsupported runtime types to supported equivalents.
 */
export const getMergedFieldType = (
  fields?: SavedObjectsFieldMapping[]
): MappingRuntimeFieldType => {
  if (!fields) return 'keyword';
  const types = fields
    .map((f) => {
      if (!f) return undefined;
      if (f.type === 'text' && f.fields) {
        // If text with keyword subfield, treat as keyword
        return Object.values(f.fields).some((sub) => sub?.type === 'keyword') ? 'keyword' : 'text';
      }
      return f.type;
    })
    .filter(Boolean) as string[];

  // Always return 'double' for any numeric type
  if (types.some((t) => NUMERIC_TYPES_SET.has(t as (typeof NUMERIC_TYPES)[number]))) {
    return 'double';
  }
  // fallback to keyword if unknown
  return (types?.[0] as MappingRuntimeFieldType) ?? 'keyword';
};
