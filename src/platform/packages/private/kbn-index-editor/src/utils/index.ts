/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { KBN_FIELD_TYPES } from '@kbn/field-types';
import { COLUMN_PLACEHOLDER_PREFIX } from '../constants';
import type { DeleteDocAction, DocUpdate } from '../types';

export function parsePrimitive(
  value: unknown,
  fieldType?: string
): string | number | boolean | object | unknown {
  if (typeof value !== 'string') {
    return value;
  }

  // For string-based fields (text/keyword) keep the raw text so values like "{}"
  // are stored as is instead of being cast.
  if (fieldType === KBN_FIELD_TYPES.STRING) {
    return value;
  }

  const trimmed = value.trim();
  const lower = trimmed.toLowerCase();

  // booleans
  if (lower === 'true') return true;
  if (lower === 'false') return false;

  // numbers
  if (trimmed !== '' && !isNaN(Number(trimmed)) && isFinite(Number(trimmed))) {
    return Number(trimmed);
  }

  // objects and arrays
  if (
    (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
    (trimmed.startsWith('[') && trimmed.endsWith(']'))
  ) {
    try {
      return JSON.parse(trimmed);
    } catch {
      return value;
    }
  }
  return value;
}

export function isPlaceholderColumn(columnName: string): boolean {
  return columnName.startsWith(COLUMN_PLACEHOLDER_PREFIX);
}

/**
 * Converts a cell value to a string for display purposes.
 */
export function getCellValue(value: unknown): string | undefined {
  if (typeof value === 'object' && value !== null) {
    return JSON.stringify(value);
  }
  return value?.toString();
}

export function isDocUpdate(update: unknown): update is { type: 'add-doc'; payload: DocUpdate } {
  return (
    typeof update === 'object' && update !== null && 'type' in update && update.type === 'add-doc'
  );
}

export function isDocDelete(update: unknown): update is DeleteDocAction {
  return (
    typeof update === 'object' &&
    update !== null &&
    'type' in update &&
    update.type === 'delete-doc'
  );
}
