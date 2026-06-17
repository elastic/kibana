/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Reads a string field off a data row using a configured field name. Returns
 * `undefined` when the row is not an object or the field is null/undefined.
 */
export const getStringField = (row: unknown, field: string): string | undefined => {
  if (row && typeof row === 'object') {
    const value = (row as Record<string, unknown>)[field];
    return value === null || value === undefined ? undefined : String(value);
  }
  return undefined;
};

/** Reads an arbitrary field off a data row. */
export const getField = (row: unknown, field: string): unknown => {
  if (row && typeof row === 'object') {
    return (row as Record<string, unknown>)[field];
  }
  return undefined;
};
