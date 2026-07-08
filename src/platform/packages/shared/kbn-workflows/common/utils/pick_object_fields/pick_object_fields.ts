/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

type PlainObject = Record<string, unknown>;

const isPlainObject = (value: unknown): value is PlainObject =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

// Deep clone limited to JSON-serializable values. Leaf values are cloned so the
// returned object never shares references with `source`, which keeps callers from
// mutating the original through overlapping paths.
const cloneValue = (value: unknown): unknown => {
  if (value === null || typeof value !== 'object') {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(cloneValue);
  }
  const clone: PlainObject = {};
  for (const [key, val] of Object.entries(value)) {
    clone[key] = cloneValue(val);
  }
  return clone;
};

/**
 * Returns a new object containing only the given dotted-path fields from `source`,
 * preserving the original nested structure and value types (numbers, booleans, and
 * arrays are kept as-is, not stringified).
 *
 * - Paths that are absent, or that traverse through a non-object, are skipped.
 * - The `source` is never mutated; leaf values are deep-cloned.
 * - A non-object `source` is returned unchanged.
 *
 * @example
 * pickObjectFields({ a: { b: 1, c: 2 }, d: 3 }, ['a.b', 'd']) // => { a: { b: 1 }, d: 3 }
 */
export const pickObjectFields = (source: unknown, paths: readonly string[]): unknown => {
  if (!isPlainObject(source)) {
    return source;
  }

  const result: PlainObject = {};

  for (const path of paths) {
    if (typeof path !== 'string' || path.length === 0) {
      continue;
    }

    const segments = path.split('.');
    let cursor: unknown = source;
    let missing = false;

    for (const segment of segments) {
      if (isPlainObject(cursor) && Object.prototype.hasOwnProperty.call(cursor, segment)) {
        cursor = cursor[segment];
      } else {
        missing = true;
        break;
      }
    }

    if (missing || cursor === undefined) {
      continue;
    }

    let target = result;
    for (let i = 0; i < segments.length - 1; i++) {
      const segment = segments[i];
      if (!isPlainObject(target[segment])) {
        target[segment] = {};
      }
      target = target[segment] as PlainObject;
    }
    target[segments[segments.length - 1]] = cloneValue(cursor);
  }

  return result;
};
