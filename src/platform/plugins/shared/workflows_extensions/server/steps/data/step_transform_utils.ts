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
 */
export function applyTransform(transform: StepTransform | undefined, value: unknown): unknown {
  let ret = value;
  if (isPlainObject(transform)) {
    if (transform.pick !== null) {
      ret = applyPick(ret, transform.pick);
    }
  }
  return ret;
}

/**
 * Applies the include (field projection) to a value using raw `pick` input
 * (object or array of dot-paths and/or nested list nodes). For arrays, applies
 * the same projection to each element. For objects, keeps only keys present in
 * the pick; only paths that exist in the source are copied.
 */
function applyPick(value: unknown, pick: unknown): unknown {
  const paths = normalizePick(pick);
  return applyPickRecursive(value, paths, 1);
}

const MAX_APPLY_INCLUDE_DEPTH = 15;

/**
 * Applies the path list to value. Throws when recursion depth exceeds MAX_APPLY_INCLUDE_DEPTH.
 */
function applyPickRecursive(value: unknown, paths: string[], recurseDepth: number): unknown {
  if (recurseDepth > MAX_APPLY_INCLUDE_DEPTH) {
    throw new Error(`Maximum recursion depth ${MAX_APPLY_INCLUDE_DEPTH} has been exceeded`);
  }
  if (paths.length === 0) {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => applyPickRecursive(item, paths, recurseDepth + 1));
  }
  if (!isPlainObject(value)) {
    return value;
  }
  const result: FieldsSpec = {};
  for (const path of paths) {
    const valueAtPath = getAtPath(value, path);
    if (valueAtPath !== undefined) {
      setAtPath(result, path, valueAtPath);
    }
  }
  return result;
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
 * Iterative walk to get an object by its dot notation. Must be aware of arrays in the middle.
 */
function getAtPath(obj: FieldsSpec, path: string): unknown {
  const keys = pathParts(path);
  let current: unknown = obj;
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    if (current == null || typeof current !== 'object') return undefined;
    if (Array.isArray(current)) {
      const remainder = keys.slice(i).join('.');
      return (current as unknown[]).map((item) =>
        isPlainObject(item) ? getAtPath(item, remainder) : undefined
      );
    }
    if (!(key in (current as FieldsSpec))) return undefined;
    current = (current as FieldsSpec)[key];
  }
  return current;
}

/**
 * Iterative walk to set an object by its dot notation. Must be aware of arrays in the middle.
 */
function setAtPath(obj: FieldsSpec, path: string, value: unknown): void {
  const keys = pathParts(path);
  if (keys.length > 0) {
    const key = keys[0];
    const remainder = keys.slice(1).join('.');
    if (Array.isArray(value)) {
      if (!(key in obj) || !Array.isArray(obj[key])) {
        obj[key] = (value as unknown[]).map(() => ({}));
      }
      const arr = obj[key] as FieldsSpec[];
      (value as unknown[]).forEach((v, i) => {
        if (arr[i] == null) arr[i] = {};
        setAtPath(arr[i] as FieldsSpec, remainder, v);
      });
    } else {
      if (remainder) {
        if (!(key in obj) || !isPlainObject(obj[key])) {
          obj[key] = {};
        }
        setAtPath(obj[key] as FieldsSpec, remainder, value);
      } else {
        obj[key] = value;
      }
    }
  }
}

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
