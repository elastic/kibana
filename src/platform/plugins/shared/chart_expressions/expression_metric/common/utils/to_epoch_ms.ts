/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Normalizes a date value to epoch milliseconds.
 *
 * ES|QL returns date strings (e.g. `"2024-01-01T00:00:00.000Z"`)
 * while esaggs returns epoch ms numbers. This helper accepts both
 * formats and always returns a numeric timestamp.
 */
export const toEpochMs = (val: unknown): number => {
  if (typeof val === 'number') return val;
  if (typeof val === 'string') return new Date(val).getTime();
  return NaN;
};
