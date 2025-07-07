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

// Priority: numeric > date > keyword > text > others
const TYPE_PRIORITY = [
  'long',
  'integer',
  'short',
  'byte',
  'double',
  'float',
  'half_float',
  'scaled_float',
  'date',
  'keyword',
] as const;

// List of sortable types in Elasticsearch (TYPE_PRIORITY plus 'boolean')
const SORTABLE_TYPES = new Set([...TYPE_PRIORITY, 'boolean']);

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
    .filter(Boolean);

  for (const t of TYPE_PRIORITY) {
    if (types.includes(t)) {
      // Map unsupported runtime types to supported equivalents
      if (t === 'integer' || t === 'short' || t === 'byte') return 'long';
      if (t === 'float' || t === 'half_float' || t === 'scaled_float') return 'double';
      return t;
    }
  }
  // fallback to keyword if unknown
  return 'keyword';
};
