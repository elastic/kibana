/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { COLUMN_PLACEHOLDER_PREFIX } from '../constants';

export function parsePrimitive(value: unknown): string | number | boolean | unknown {
  if (typeof value !== 'string') {
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
  return value;
}

export function isPlaceholderColumn(columnName: string): boolean {
  return columnName.startsWith(COLUMN_PLACEHOLDER_PREFIX);
}
