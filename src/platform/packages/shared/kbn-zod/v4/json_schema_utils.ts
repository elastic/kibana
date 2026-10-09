/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const SCHEMA_OBJECT_MAP_KEYS = new Set([
  'properties',
  'patternProperties',
  '$defs',
  'definitions',
  'dependentSchemas',
]);

const SCHEMA_ARRAY_KEYS = new Set(['prefixItems', 'anyOf', 'oneOf', 'allOf']);

const SCHEMA_SINGLE_KEYS = new Set(['not', 'propertyNames', 'contains', 'if', 'then', 'else']);

const jsonPointerUnescape = (segment: string): string =>
  segment.replace(/~1/g, '/').replace(/~0/g, '~');

const normalizeSchemaRecord = (record: Record<string, unknown>): Record<string, unknown> =>
  Object.fromEntries(
    Object.entries(record).map(([key, value]) => [key, normalizeJsonSchemaNode(value)])
  );

const applyTypeArrayNormalization = (node: Record<string, unknown>): Record<string, unknown> => {
  const typeValue = node.type;
  if (!Array.isArray(typeValue) || !typeValue.every((entry) => typeof entry === 'string')) {
    return node;
  }

  const types = typeValue as string[];
  const hadNull = types.includes('null');
  const nonNullTypes = types.filter((entry) => entry !== 'null');
  const { type: _type, ...rest } = node;

  if (nonNullTypes.length === 0) {
    return { ...rest, type: 'null' };
  }

  const result: Record<string, unknown> = { ...rest };
  if (hadNull) {
    result.nullable = true;
  }

  if (nonNullTypes.length === 1) {
    result.type = nonNullTypes[0];
    return result;
  }

  const typeAnyOf = nonNullTypes.map((entry) => ({ type: entry }));
  if (result.anyOf !== undefined) {
    const existingAnyOf = result.anyOf;
    delete result.anyOf;
    result.allOf = [{ anyOf: existingAnyOf }, { anyOf: typeAnyOf }];
  } else {
    result.anyOf = typeAnyOf;
  }

  return result;
};

const normalizeJsonSchemaNode = (value: unknown): unknown => {
  if (value === null || typeof value !== 'object') {
    return value;
  }

  if (Array.isArray(value)) {
    return value;
  }

  const input = value as Record<string, unknown>;
  const node: Record<string, unknown> = {};

  for (const [key, entry] of Object.entries(input)) {
    if (
      SCHEMA_OBJECT_MAP_KEYS.has(key) &&
      entry !== null &&
      typeof entry === 'object' &&
      !Array.isArray(entry)
    ) {
      node[key] = normalizeSchemaRecord(entry as Record<string, unknown>);
      continue;
    }

    if (
      key === 'additionalProperties' &&
      entry !== null &&
      typeof entry === 'object' &&
      !Array.isArray(entry)
    ) {
      node[key] = normalizeJsonSchemaNode(entry);
      continue;
    }

    if (key === 'items') {
      node[key] = Array.isArray(entry)
        ? entry.map((item) => normalizeJsonSchemaNode(item))
        : normalizeJsonSchemaNode(entry);
      continue;
    }

    if (SCHEMA_ARRAY_KEYS.has(key) && Array.isArray(entry)) {
      node[key] = entry.map((item) => normalizeJsonSchemaNode(item));
      continue;
    }

    if (SCHEMA_SINGLE_KEYS.has(key)) {
      node[key] = normalizeJsonSchemaNode(entry);
      continue;
    }

    node[key] = entry;
  }

  return applyTypeArrayNormalization(node);
};

/** Rewrites JSON Schema `type` arrays (emitted by zod >= 4.5) into the `nullable`/`anyOf` form. */
export const normalizeJsonSchemaTypeArrays = <T>(schema: T): T =>
  normalizeJsonSchemaNode(schema) as T;

/** Inlines a root-level `$ref` (emitted by zod >= 4.5 for roots with `.meta({ id })`) so the root is a concrete schema. */
export const inlineRootJsonSchemaRef = <T>(schema: T): T => {
  if (schema === null || typeof schema !== 'object' || Array.isArray(schema)) {
    return schema;
  }

  const root = schema as Record<string, unknown>;
  const ref = root.$ref;
  if (typeof ref !== 'string') {
    return schema;
  }

  let container: Record<string, unknown> | undefined;
  let definitionName: string | undefined;

  const defsMatch = ref.match(/^#\/\$defs\/(.+)$/);
  if (defsMatch) {
    const defs = root.$defs;
    if (defs !== null && typeof defs === 'object' && !Array.isArray(defs)) {
      container = defs as Record<string, unknown>;
      definitionName = jsonPointerUnescape(defsMatch[1]);
    }
  } else {
    const definitionsMatch = ref.match(/^#\/definitions\/(.+)$/);
    if (definitionsMatch) {
      const definitions = root.definitions;
      if (definitions !== null && typeof definitions === 'object' && !Array.isArray(definitions)) {
        container = definitions as Record<string, unknown>;
        definitionName = jsonPointerUnescape(definitionsMatch[1]);
      }
    }
  }

  if (container === undefined || definitionName === undefined) {
    return schema;
  }

  const definition = container[definitionName];
  if (definition === null || typeof definition !== 'object' || Array.isArray(definition)) {
    return schema;
  }

  const { $ref: _ref, ...rootWithoutRef } = root;
  return {
    ...rootWithoutRef,
    ...(definition as Record<string, unknown>),
  } as T;
};
