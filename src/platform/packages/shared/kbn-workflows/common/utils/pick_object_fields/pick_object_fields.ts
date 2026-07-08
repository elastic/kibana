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

// Keys that would let a crafted path walk into the prototype chain and pollute
// Object.prototype during the write phase below. The shared Liquid engine enforces
// `ownPropertyOnly` for template access; this keeps the raw JS traversal here in step.
const UNSAFE_SEGMENTS = new Set(['__proto__', 'prototype', 'constructor']);

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

// Copies a single dotted `path` from `source` into `result`, in place. Absent paths,
// paths that traverse a non-object, and prototype-polluting paths are ignored.
const copyPath = (source: PlainObject, result: PlainObject, path: string): void => {
  if (path.length === 0) {
    return;
  }

  const segments = path.split('.');
  if (segments.some((segment) => UNSAFE_SEGMENTS.has(segment))) {
    return;
  }

  let cursor: unknown = source;
  for (const segment of segments) {
    if (isPlainObject(cursor) && Object.prototype.hasOwnProperty.call(cursor, segment)) {
      cursor = cursor[segment];
    } else {
      return;
    }
  }

  if (cursor === undefined) {
    return;
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
};

/**
 * Returns a new object containing only the given dotted-path fields from `source`,
 * preserving the original nested structure and value types (numbers, booleans, and
 * arrays are kept as-is, not stringified).
 *
 * - Paths that are absent, or that traverse through a non-object, are skipped.
 * - Paths containing `__proto__`, `prototype`, or `constructor` are skipped to
 *   avoid prototype pollution.
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
    if (typeof path === 'string') {
      copyPath(source, result, path);
    }
  }

  return result;
};
