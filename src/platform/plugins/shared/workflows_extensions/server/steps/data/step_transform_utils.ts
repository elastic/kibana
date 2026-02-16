/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Shared transform logic for steps (e.g. data.map). Applies context.input.transform
 * to values; supports `pick` (field projection) and can be extended for other transforms.
 */

export type FieldsSpec = Record<string, unknown>;
export interface StepTransform {
  pick?: unknown;
}

/**
 * Applies the given transform to a value. If transform is null or undefined,
 * returns the value unchanged. Applies all the transforms contained, which includes pick.
 * If clone is true, clones the value first and applies the transform to the clone so the original is not mutated.
 */
export function applyTransform(
  transform: StepTransform | undefined,
  value: unknown,
  clone: boolean = false
): unknown {
  const target = clone ? structuredClone(value) : value;
  if (isPlainObject(transform)) {
    if (transform.pick !== null) {
      applyPickInPlace(target, normalizePick(transform.pick), 1);
    }
  }
  return target;
}

const MAX_APPLY_INCLUDE_DEPTH = 15;

/**
 * Mutates value in place by deleting keys not in the path list. Throws when depth exceeds MAX_APPLY_INCLUDE_DEPTH.
 */
function applyPickInPlace(value: unknown, paths: string[], recurseDepth: number): unknown {
  if (recurseDepth > MAX_APPLY_INCLUDE_DEPTH) {
    throw new Error(`Maximum recursion depth ${MAX_APPLY_INCLUDE_DEPTH} has been exceeded`);
  }
  if (paths.length === 0) {
    return value;
  }
  if (Array.isArray(value)) {
    value.forEach((item) => applyPickInPlace(item, paths, recurseDepth + 1));
    return value;
  }
  if (!isPlainObject(value)) {
    return value;
  }
  const allowedKeys = new Set(paths.map((p) => pathParts(p)[0]).filter(Boolean));
  for (const key of Object.keys(value)) {
    if (!allowedKeys.has(key)) {
      delete value[key];
    }
  }
  for (const key of allowedKeys) {
    if (key in value) {
      const nestedPaths = paths
        .filter((p) => pathParts(p)[0] === key)
        .map((p) => pathParts(p).slice(1).join('.'))
        .filter(Boolean);
      if (nestedPaths.length > 0) {
        applyPickInPlace(value[key], nestedPaths, recurseDepth + 1);
      }
    }
  }
  return value;
}

function isPlainObject(value: unknown): value is FieldsSpec {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Plain object with at least one key (nested spec or list-format node). */
function isNonEmptyPlainObject(value: unknown): value is FieldsSpec {
  return isPlainObject(value) && Object.keys(value).length > 0;
}

/**
 * Normalizes raw `pick` input to an array of dot-path strings.
 * Object spec (e.g. { a: { b: {} } }) and array format (strings + list-format nodes) are supported.
 */
function normalizePick(raw: unknown): string[] {
  if (isPlainObject(raw)) {
    return specToPaths(raw as FieldsSpec, '');
  }
  if (Array.isArray(raw)) {
    return flattenPickToPaths(raw, '');
  }
  return [];
}

/** Walks a spec object and returns dot-path strings for each leaf key. */
function specToPaths(spec: FieldsSpec, prefix: string): string[] {
  const paths: string[] = [];
  for (const key of Object.keys(spec)) {
    const segment = prefix ? `${prefix}.${key}` : key;
    const child = spec[key];
    if (isNonEmptyPlainObject(child)) {
      paths.push(...specToPaths(child as FieldsSpec, segment));
    } else {
      paths.push(segment);
    }
  }
  return paths;
}

/** Just a utility to change a dotted path into an array */
const pathParts = (path: string): string[] =>
  path
    .split('.')
    .map((k) => k.trim())
    .filter(Boolean);

/**
 * Flattens array pick format to dot-path strings. List-format nodes are
 * objects whose values are arrays of paths or nested list-format nodes.
 */
function flattenPickToPaths(elements: unknown[], prefix: string): string[] {
  const paths: string[] = [];
  for (const element of elements) {
    if (typeof element === 'string') {
      paths.push(prefix ? `${prefix}.${element}` : element);
    } else if (isPlainObject(element)) {
      for (const key of Object.keys(element)) {
        const child = element[key];
        const segment = prefix ? `${prefix}.${key}` : key;
        if (Array.isArray(child)) {
          paths.push(...flattenPickToPaths(child, segment));
        } else {
          paths.push(segment);
        }
      }
    }
  }
  return paths;
}
