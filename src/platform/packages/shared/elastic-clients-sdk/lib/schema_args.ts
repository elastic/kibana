/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import type { JsonSchemaObject } from './json_schema';

/**
 * Represents a single CLI argument derived from a top-level key in a command's input schema.
 */
export interface SchemaArgDefinition {
  /** Original key name as defined in the schema (e.g., `num_shards`, `refreshInterval`) */
  schemaKey: string;

  /** Declared type from schema introspection */
  type: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'enum';

  /** Whether the field is required (present in the schema `required` array) */
  required: boolean;

  /** Default value from the schema, if any */
  defaultValue?: unknown;

  /** Description from the schema's metadata, used in help text */
  description: string;

  /** Routing destination derived from `x-found-in`, or `undefined` if absent */
  foundIn?: FoundIn;

  /**
   * True when the schema accepts both a scalar and an array form.
   * Checked via anyOf / type arrays containing "array".
   */
  acceptsArrayForm?: boolean;
}

/** Valid routing destinations for a parameter derived from `x-found-in` metadata. */
export type FoundIn = 'path' | 'query' | 'body';

/**
 * A bidirectional mapping between kebab-case CLI flag names and original schema keys.
 */
export interface FlagKeyMap {
  /** Maps `cliFlag` -> `schemaKey` for reverse lookup during merge */
  toSchemaKey: Map<string, string>;

  /** Maps `schemaKey` -> `cliFlag` for registration and help text */
  toCliFlag: Map<string, string>;
}

/**
 * Converts a schema key to its kebab-case CLI flag name.
 * Handles snake_case, camelCase, and plain lowercase inputs.
 *
 * @example
 * ```ts
 * toKebabCase('num_shards')      // 'num-shards'
 * toKebabCase('refreshInterval') // 'refresh-interval'
 * toKebabCase('index')           // 'index'
 * ```
 */
export function toKebabCase(key: string): string {
  return key
    .replace(/^_+/, '') // strip leading underscores (e.g. Elasticsearch's _source, _meta)
    .replace(/_/g, '-')
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .toLowerCase();
}

/** A property schema as it appears in a JSON Schema `properties` map */
interface PropertySchema {
  type?: string | string[];
  anyOf?: PropertySchema[];
  oneOf?: PropertySchema[];
  description?: string;
  default?: unknown;
  'x-found-in'?: string;
}

/**
 * Resolves the effective type name for a property schema.
 * Handles `anyOf`, `oneOf`, and `type` arrays by returning the first
 * non-null concrete type. Returns `'string'` as a fallback.
 */
function resolveTypeName(prop: PropertySchema): SchemaArgDefinition['type'] {
  const candidates = prop.anyOf ?? prop.oneOf;
  if (candidates != null && candidates.length > 0) {
    for (const branch of candidates) {
      const t = resolveTypeName(branch);
      if (t !== 'string' || branch.type === 'string') return t;
    }
  }

  const rawType = Array.isArray(prop.type) ? prop.type.find((t) => t !== 'null') : prop.type;

  switch (rawType) {
    case 'integer':
    case 'number':
      return 'number';
    case 'boolean':
      return 'boolean';
    case 'array':
      return 'array';
    case 'object':
      return 'object';
    default:
      return 'string';
  }
}

/**
 * Returns true when the property schema accepts an array form anywhere in
 * its anyOf / oneOf branches or has type `"array"`.
 */
function acceptsArrayForm(prop: PropertySchema): boolean {
  const rawType = prop.type;
  if (rawType === 'array' || (Array.isArray(rawType) && rawType.includes('array'))) return true;

  const branches = prop.anyOf ?? prop.oneOf;
  if (branches != null) {
    return branches.some((b) => acceptsArrayForm(b));
  }
  return false;
}

/**
 * Extracts input params from a JSON Schema object.
 *
 * Each top-level property in `schema.properties` becomes one {@link SchemaArgDefinition}
 * with its type, required status, description, and routing destination (`x-found-in`).
 *
 * Returns an empty array when `schema` has no `properties`.
 */
export function extractSchemaArgs(schema: unknown): SchemaArgDefinition[] {
  const jsonSchema = schema as JsonSchemaObject | null | undefined;
  if (jsonSchema == null) return [];

  const properties = jsonSchema.properties as Record<string, PropertySchema> | undefined;
  if (properties == null || typeof properties !== 'object') return [];

  const requiredSet = new Set<string>(
    Array.isArray(jsonSchema.required) ? (jsonSchema.required as string[]) : []
  );

  return Object.entries(properties).map(([key, propSchema]) => {
    const prop = propSchema as PropertySchema;
    const type = resolveTypeName(prop);
    const required = requiredSet.has(key);
    const description = prop.description ?? '';
    const defaultValue = prop.default;
    const foundInRaw = prop['x-found-in'];
    const foundIn =
      foundInRaw === 'path' || foundInRaw === 'query' || foundInRaw === 'body'
        ? (foundInRaw as FoundIn)
        : undefined;
    const hasArrayForm = type !== 'array' && acceptsArrayForm(prop);

    return {
      schemaKey: key,
      type,
      required,
      ...(defaultValue !== undefined ? { defaultValue } : {}),
      description,
      ...(foundIn !== undefined ? { foundIn } : {}),
      ...(hasArrayForm ? { acceptsArrayForm: true } : {}),
    };
  });
}

/**
 * @deprecated No longer needed — `x-found-in` is injected by the schema generator.
 * Kept for backward compatibility; will be removed in a future cleanup.
 */
export function extractFoundIn(_field: unknown): FoundIn | undefined {
  return undefined;
}
