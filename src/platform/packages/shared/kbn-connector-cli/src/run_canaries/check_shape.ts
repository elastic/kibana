/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ExpectedType, FixtureExpectation } from './types';

const MISSING = Symbol('missing');

/** `$` addresses the response `data` itself, for actions whose result has no fields to check. */
const ROOT_PATH = '$';

// `Number()` would also accept '', ' ', '0x0' and '1e0', so a typo in a path could resolve to a real element.
const ARRAY_INDEX_PATTERN = /^(0|[1-9]\d*)$/;

const resolvePath = (data: unknown, dottedPath: string): unknown => {
  if (dottedPath === ROOT_PATH) return data;
  let current = data;
  for (const segment of dottedPath.split('.')) {
    if (Array.isArray(current)) {
      if (!ARRAY_INDEX_PATTERN.test(segment)) return MISSING;
      const index = Number(segment);
      if (index >= current.length) return MISSING;
      current = current[index];
    } else if (
      typeof current === 'object' &&
      current !== null &&
      Object.prototype.hasOwnProperty.call(current, segment)
    ) {
      current = (current as Record<string, unknown>)[segment];
    } else {
      return MISSING;
    }
  }
  return current;
};

const typeOf = (value: unknown): ExpectedType | 'other' => {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  const t = typeof value;
  return t === 'string' || t === 'number' || t === 'boolean' || t === 'object' ? t : 'other';
};

/** Returns a description of every expectation the response `data` does not meet; empty means it matches. */
export const checkShape = (data: unknown, expectations: FixtureExpectation[]): string[] => {
  const mismatches: string[] = [];
  for (const { path, type } of expectations) {
    const value = resolvePath(data, path);
    if (value === MISSING) {
      mismatches.push(`"${path}" is missing (expected ${type})`);
      continue;
    }
    const actual = typeOf(value);
    if (actual !== type) {
      mismatches.push(`"${path}" is ${actual} (expected ${type})`);
    }
  }
  return mismatches;
};
