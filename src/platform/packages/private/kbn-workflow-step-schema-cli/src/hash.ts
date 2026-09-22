/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createHash } from 'crypto';
import type { JsonObject, JsonValue } from './types';

/**
 * Deterministic JSON serialization: object keys are sorted recursively (array
 * order is preserved, since it is semantically meaningful in JSON Schema). This
 * gives stable diffs and reproducible, byte-identical artifacts across runs.
 */
export const stableStringify = (value: JsonValue, pretty = false): string =>
  JSON.stringify(sortKeys(value), null, pretty ? 2 : 0);

const sortKeys = (value: JsonValue): JsonValue => {
  if (Array.isArray(value)) {
    return value.map(sortKeys);
  }
  if (value === null || typeof value !== 'object') {
    return value;
  }
  const sorted: JsonObject = {};
  for (const key of Object.keys(value).sort()) {
    sorted[key] = sortKeys(value[key]);
  }
  return sorted;
};

/** sha256 (hex) of the exact string bytes. */
export const sha256Hex = (input: string): string =>
  createHash('sha256').update(input, 'utf8').digest('hex');
