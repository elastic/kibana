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

import type { z } from '@kbn/zod';

/**
 * Represents a single CLI argument derived from a top-level key in a command's input schema.
 */
export interface SchemaArgDefinition {
  /** Original key name as defined in the Zod schema (e.g., `num_shards`, `refreshInterval`) */
  schemaKey: string;

  /** Declared type from schema introspection */
  type: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'enum';

  /** Whether the field is required (no default, not optional) */
  required: boolean;

  /** Default value from the schema, if any */
  defaultValue?: unknown;

  /** Description from the schema's metadata, used in help text */
  description: string;

  /** Routing destination derived from `.meta({found_in: ...})`, or `undefined` if absent */
  foundIn?: FoundIn;

  /**
   * True when the schema accepts both a scalar and an array form (e.g. `Fields = union(Field, array(Field))`).
   * Registered CLI flag is still scalar for UX; callers split comma-separated values into arrays where
   * the destination demands it (e.g. JSON request bodies).
   */
  acceptsArrayForm?: boolean;
}

/** Valid routing destinations for a parameter derived from `found_in` Zod metadata. */
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

/** Minimal shape of a Zod field def for the properties we need to introspect. */
interface ZodFieldDef {
  type: string;
  innerType?: { def: ZodFieldDef };
  defaultValue?: unknown;
  getter?: () => z.ZodType;
  options?: z.ZodType[];
}

/**
 * Unwraps wrapper types from a Zod schema field, resolving lazy thunks,
 * records, unions, and any/unknown to their CLI-appropriate type names.
 */
function unwrapField(field: z.ZodType): {
  typeName: string;
  isOptional: boolean;
  defaultValue?: unknown;
} {
  const def = field.def as ZodFieldDef;
  if (def.type === 'date') {
    throw new Error(
      'Date cannot be represented in JSON Schema: use z.string() with an ISO-8601 description instead of z.date()'
    );
  }

  if (def.type === 'optional') {
    const inner = unwrapField(def.innerType as z.ZodType);
    return { ...inner, isOptional: true };
  }

  if (def.type === 'default') {
    const inner = unwrapField(def.innerType as z.ZodType);
    return { ...inner, defaultValue: def.defaultValue, isOptional: false };
  }

  if (def.type === 'lazy' && typeof def.getter === 'function') {
    return unwrapField(def.getter());
  }

  if (def.type === 'record' || def.type === 'any' || def.type === 'unknown') {
    return { typeName: 'object', isOptional: false };
  }

  if (def.type === 'union' && Array.isArray(def.options) && def.options.length > 0) {
    return unwrapField(def.options[0] as z.ZodType);
  }

  return { typeName: def.type, isOptional: false };
}

const PARAMS_TYPES = new Set(['string', 'number', 'boolean', 'object', 'array', 'enum']);

/**
 * Extracts input params from a Zod object schema.
 * Each top-level key becomes a `SchemaArgDefinition` with its kebab-case name,
 * type, required status, default value, and description.
 *
 * Returns an empty array if `schema` is not a Zod object schema.
 */
export function extractSchemaArgs(schema: unknown): SchemaArgDefinition[] {
  const shape = (schema as z.ZodObject<z.ZodRawShape> | null)?.shape;
  if (shape == null || typeof shape !== 'object') return [];

  return Object.entries(shape).map(([key, fieldSchema]) => {
    const { typeName, isOptional, defaultValue } = unwrapField(fieldSchema as z.ZodType);
    const type = (PARAMS_TYPES.has(typeName) ? typeName : 'string') as SchemaArgDefinition['type'];

    // Read description from the Zod globalRegistry -- much faster than calling
    // .toJSONSchema() per field, which would force lazy-schema evaluation.
    // The outer field may carry found_in meta while the inner type (unwrapped from
    // optional/default) carries the description, so we check both levels.
    const outerMeta = (fieldSchema as z.ZodType).meta() as
      | Record<string, unknown>
      | null
      | undefined;
    let description: string =
      typeof outerMeta?.description === 'string' ? outerMeta.description : '';
    if (description === '') {
      const innerType = ((fieldSchema as z.ZodType).def as { innerType?: z.ZodType } | undefined)
        ?.innerType;
      if (innerType != null) {
        const innerMeta = innerType.meta() as Record<string, unknown> | null | undefined;
        if (typeof innerMeta?.description === 'string') description = innerMeta.description;
      }
    }

    const foundIn = extractFoundIn(fieldSchema as z.ZodType);
    const acceptsArrayForm = type !== 'array' && schemaAcceptsArrayForm(fieldSchema as z.ZodType);
    return {
      schemaKey: key,
      type,
      required: !isOptional && defaultValue === undefined,
      defaultValue,
      description,
      ...(foundIn !== undefined ? { foundIn } : {}),
      ...(acceptsArrayForm ? { acceptsArrayForm: true } : {}),
    };
  });
}

/**
 * Returns true when the schema (or any branch of its unions) accepts an array form.
 *
 * Elasticsearch commonly types fields as `union(T, array(T))` (e.g. `Fields`, `Indices`),
 * which `unwrapField` collapses to the scalar branch for CLI ergonomics. Body-routed
 * arguments still need the array form because ES does not split CSV strings inside JSON
 * bodies (only in querystrings and URL paths).
 */
function schemaAcceptsArrayForm(field: z.ZodType): boolean {
  const def = field.def as ZodFieldDef;
  if (def.type === 'array') return true;
  if ((def.type === 'optional' || def.type === 'default') && def.innerType != null) {
    return schemaAcceptsArrayForm(def.innerType as unknown as z.ZodType);
  }
  if (def.type === 'lazy' && typeof def.getter === 'function') {
    return schemaAcceptsArrayForm(def.getter());
  }
  if (def.type === 'union' && Array.isArray(def.options)) {
    return def.options.some((o) => schemaAcceptsArrayForm(o));
  }
  return false;
}

/**
 * Extracts the `found_in` routing metadata from a Zod field.
 *
 * Reads `.meta()` from the outermost type first; if absent, walks one level into
 * wrapper types (`optional`, `default`) to find it on the inner type.
 *
 * @returns the routing destination, or `undefined` if no `found_in` metadata is present
 */
export function extractFoundIn(field: z.ZodType): FoundIn | undefined {
  // check outermost first
  const outerMeta = field.meta() as Record<string, unknown> | undefined;
  if (outerMeta?.found_in != null) return outerMeta.found_in as FoundIn;

  // walk one wrapper level (optional/default) to find meta on inner type
  const innerType = (field.def as { innerType?: z.ZodType }).innerType;
  if (innerType != null) {
    const innerMeta = innerType.meta() as Record<string, unknown> | undefined;
    if (innerMeta?.found_in != null) return innerMeta.found_in as FoundIn;
  }

  return undefined;
}
