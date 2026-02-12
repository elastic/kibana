/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Shared field-projection (include/pick) logic for including fields in a step.
 * Normalizes object or array (dot-path + nested list) format into a spec and
 * applies it to values.
 */

export type FieldsSpec = Record<string, unknown>;

/**
 * Applies the include (field projection) to a value using raw `pick` input
 * (object or array of dot-paths and/or nested list nodes). For arrays, applies
 * the same projection to each element. For objects, keeps only keys present in
 * the pick spec; if the spec value is a nested object, recurses into that branch.
 */
export function applyInclude(value: unknown, pick: unknown): unknown {
  return applyIncludeRecurse(pick, value, 1);
}

const MAX_APPLY_INCLUDE_DEPTH = 15;

/** Thrown when recursion exceeds MAX_APPLY_INCLUDE_DEPTH; allows handler try/catch to surface the error. */
class ApplyIncludeDepthError extends Error {
  constructor() {
    super(`Maximum recursion depth ${MAX_APPLY_INCLUDE_DEPTH} has been exceeded`);
    this.name = 'ApplyIncludeDepthError';
  }
}

/**
 * Recurses and throws ApplyIncludeDepthError when depth is exceeded so the error propagates to the caller.
 */
function applyIncludeRecurse(pick: unknown, value: unknown, recurseDepth: number): unknown {
  if (recurseDepth > MAX_APPLY_INCLUDE_DEPTH) {
    throw new ApplyIncludeDepthError();
  }
  const spec = normalizeFieldsSpec(pick);
  if (!isPlainObject(spec)) {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => applyIncludeRecurse(spec, item, recurseDepth + 1));
  }
  if (isPlainObject(value)) {
    const result: Record<string, unknown> = {};
    for (const key of Object.keys(spec)) {
      if (key in value) {
        const childSpec = spec[key];
        const childValue = value[key];
        if (isNonEmptyPlainObject(childSpec)) {
          result[key] = applyIncludeRecurse(childSpec, childValue, recurseDepth + 1);
        } else {
          result[key] = childValue;
        }
      }
    }
    return result;
  }
  return value;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Plain object with at least one key (nested spec or list-format node). */
function isNonEmptyPlainObject(value: unknown): value is Record<string, unknown> {
  return isPlainObject(value) && Object.keys(value).length > 0;
}

/**
 * Converts raw `pick` input (object or array format) into a single FieldsSpec.
 * Array format can mix dot-path strings and nested list nodes.
 */
function normalizeFieldsSpec(raw: unknown): FieldsSpec {
  if (isPlainObject(raw)) {
    return raw as FieldsSpec;
  }
  if (!Array.isArray(raw)) {
    return {};
  }
  const elementToSpec = (element: unknown): FieldsSpec => {
    if (typeof element === 'string') return pathToSpec(element);
    if (isNonEmptyPlainObject(element)) return listFormatToSpec([element]);
    return {};
  };
  return raw.reduce<FieldsSpec>(
    (spec, element) => deepMergeSpecs(spec, elementToSpec(element)),
    {}
  );
}

/** Dot-path string → nested spec, e.g. 'a.b' → { a: { b: {} } }. */
function pathToSpec(path: string): FieldsSpec {
  const keys = path
    .split('.')
    .map((k) => k.trim())
    .filter(Boolean);
  if (keys.length === 0) return {};
  return keys.reduceRight<FieldsSpec>((child, key) => ({ [key]: child }), {});
}

/** List format: strings and/or { key: string[] | nested nodes }. */
function listFormatToSpec(nodes: unknown[]): FieldsSpec {
  let spec: FieldsSpec = {};
  for (const node of nodes) {
    if (typeof node === 'string') {
      spec = deepMergeSpecs(spec, pathToSpec(node));
    } else if (isNonEmptyPlainObject(node)) {
      for (const key of Object.keys(node)) {
        const child = node[key];
        spec[key] = Array.isArray(child) ? listFormatToSpec(child) : {};
      }
    }
  }
  return spec;
}

/**
 * Recursive merge of A and B as a union of fields at the same level
 */
function deepMergeSpecs(a: FieldsSpec, b: FieldsSpec): FieldsSpec {
  const result: Record<string, unknown> = { ...a };
  for (const key of Object.keys(b)) {
    const bVal = b[key];
    if (!(key in result)) {
      result[key] = bVal;
    } else {
      const aVal = result[key];
      if (isPlainObject(aVal) && isPlainObject(bVal)) {
        result[key] = deepMergeSpecs(aVal as FieldsSpec, bVal as FieldsSpec);
      } else {
        result[key] = bVal;
      }
    }
  }
  return result as FieldsSpec;
}
