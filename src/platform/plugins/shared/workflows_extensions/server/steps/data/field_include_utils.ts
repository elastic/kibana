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
 * Converts raw `fields`/`pick` input (object or array format) into a single
 * FieldsSpec. Array format can mix dot-path strings and nested list nodes.
 */
export function normalizeFieldsSpec(raw: unknown): FieldsSpec {
  if (raw !== null && typeof raw === 'object' && !Array.isArray(raw)) {
    return raw as FieldsSpec;
  }
  if (!Array.isArray(raw)) {
    return {};
  }
  let spec: FieldsSpec = {};
  for (const element of raw) {
    let partial: FieldsSpec;
    if (typeof element === 'string') {
      partial = pathToSpec(element);
    } else if (isListNode(element)) {
      partial = listFormatToSpec([element]);
    } else {
      partial = {};
    }
    spec = deepMergeSpecs(spec, partial);
  }
  return spec;
}

/**
 * Applies the include (field projection) to a value. For arrays, applies the
 * same spec to each element. For objects, keeps only keys present in the spec;
 * if the spec value is a nested object, recurses into that branch.
 */
export function applyInclude(value: unknown, fieldsSpec: FieldsSpec | null | undefined): unknown {
  if (fieldsSpec == null || typeof fieldsSpec !== 'object' || Array.isArray(fieldsSpec)) {
    return value;
  }
  const spec = fieldsSpec as FieldsSpec;
  if (Array.isArray(value)) {
    return value.map((item) => applyInclude(item, spec));
  }
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    const obj = value as Record<string, unknown>;
    const result: Record<string, unknown> = {};
    for (const key of Object.keys(spec)) {
      if (key in obj) {
        const childSpec = spec[key];
        const childValue = obj[key];
        result[key] = isNestedSpec(childSpec)
          ? applyInclude(childValue, childSpec as FieldsSpec)
          : childValue;
      }
    }
    return result;
  }
  return value;
}

function pathToSpec(path: string): FieldsSpec {
  const trimmed = path.trim();
  if (trimmed === '') return {};
  const keys = trimmed.split('.');
  let current: FieldsSpec = {};
  const root: FieldsSpec = current;
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i].trim();
    if (key !== '') {
      const isLeaf = i === keys.length - 1;
      if (!(key in current)) {
        (current as Record<string, unknown>)[key] = isLeaf ? {} : {};
      }
      if (!isLeaf) {
        const next = (current as Record<string, unknown>)[key];
        if (typeof next === 'object' && next !== null && !Array.isArray(next)) {
          current = next as FieldsSpec;
        }
      }
    }
  }
  return root;
}

function isListNode(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    Object.keys(value).length > 0
  );
}

function listFormatToSpec(nodes: unknown[]): FieldsSpec {
  let spec: FieldsSpec = {};
  for (const node of nodes) {
    if (typeof node === 'string') {
      const pathSpec = pathToSpec(node);
      spec = deepMergeSpecs(spec, pathSpec);
    } else if (isListNode(node)) {
      for (const key of Object.keys(node)) {
        const child = node[key];
        (spec as Record<string, unknown>)[key] = Array.isArray(child)
          ? listFormatToSpec(child)
          : {};
      }
    }
  }
  return spec;
}

function deepMergeSpecs(a: FieldsSpec, b: FieldsSpec): FieldsSpec {
  const result = { ...a } as Record<string, unknown>;
  for (const key of Object.keys(b)) {
    const bVal = (b as Record<string, unknown>)[key];
    if (!(key in result)) {
      result[key] = bVal;
    } else {
      const aVal = result[key];
      if (
        typeof aVal === 'object' &&
        aVal !== null &&
        !Array.isArray(aVal) &&
        typeof bVal === 'object' &&
        bVal !== null &&
        !Array.isArray(bVal)
      ) {
        result[key] = deepMergeSpecs(aVal as FieldsSpec, bVal as FieldsSpec);
      } else {
        result[key] = bVal;
      }
    }
  }
  return result as FieldsSpec;
}

function isNestedSpec(value: unknown): value is FieldsSpec {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    Object.keys(value as object).length > 0
  );
}
