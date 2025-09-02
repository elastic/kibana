/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ZodFirstPartySchemaTypes } from '@kbn/zod';
import { z } from '@kbn/zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

export function parsePath(path: string) {
  const segments = path
    .replace(/\[(['"]?)([^\]]+)\1\]/g, '.$2') // Convert [key] to .key
    .split('.');
  return segments.some((s) => s === '') ? null : segments;
}

/**
 * Get zod schema at a given path.
 * @param schema - The zod schema to get the path from.
 * @param path - The path to get the schema from. e.g. `choices[0].message['content']`
 * @param options - The options for the function.
 * @param options.partial - If true, return the schema for the last valid path segment.
 * @returns The schema at the given path or null if the path is invalid.
 */
export function getSchemaAtPath(
  schema: z.ZodType,
  path: string,
  { partial = false }: { partial?: boolean } = {}
) {
  try {
    const segments = parsePath(path);
    if (!segments) {
      return null;
    }

    let current = schema;

    for (const segment of segments) {
      if (current instanceof z.ZodObject) {
        const shape = current.shape;
        if (!(segment in shape)) {
          return partial ? current : null;
        }
        current = shape[segment];
      } else if (current instanceof z.ZodUnion) {
        const branches = current.options;
        const validBranch = branches.find((branch: z.ZodType) =>
          isValidSchemaPath(branch, segment)
        );
        if (!validBranch) {
          return partial ? current : null;
        }
        current = validBranch;
      } else if (current instanceof z.ZodArray) {
        if (!/^\d+$/.test(segment)) {
          return partial ? current : null;
        }
        const index = parseInt(segment, 10);

        // Reject negative indices
        if (index < 0) {
          return partial ? current : null;
        }

        // Only enforce bounds checking for arrays with explicit length constraints
        const maxLength = current._def.maxLength?.value ?? current._def.exactLength?.value;
        if (maxLength !== undefined && index >= maxLength) {
          return partial ? current : null;
        }

        // For unconstrained arrays, we allow any non-negative index for schema introspection
        // This is because we're validating schema paths, not runtime data
        current = current.element;
      } else if (current instanceof z.ZodAny) {
        return z.any();
      } else {
        return null;
      }
    }

    return current;
  } catch {
    return null;
  }
}

/**
 * Check if a path is valid for a given zod schema.
 * @param schema - The zod schema to check the path for.
 * @param path - The path to check. e.g. `choices[0].message['content']`
 * @returns True if the path is valid, false otherwise.
 */
export function isValidSchemaPath(schema: z.ZodType, path: string) {
  return getSchemaAtPath(schema, path) !== null;
}

/**
 * Infer a zod schema from an object.
 * @param obj - The object to infer the schema from.
 * @returns The inferred zod schema.
 */
export function inferZodType(obj: any): z.ZodType {
  if (obj === null) return z.null();
  if (obj === undefined) return z.undefined();

  const type = typeof obj;

  if (type === 'string') return z.string();
  if (type === 'number') return z.number();
  if (type === 'boolean') return z.boolean();

  if (Array.isArray(obj)) {
    if (obj.length === 0) return z.array(z.unknown());
    return z.array(inferZodType(obj[0])).length(obj.length);
  }

  if (type === 'object') {
    const shape: Record<string, z.ZodSchema> = {};
    for (const [key, value] of Object.entries(obj)) {
      shape[key] = inferZodType(value);
    }
    return z.object(shape);
  }

  return z.unknown();
}

export function expectZodSchemaEqual(a: z.ZodType, b: z.ZodType) {
  expect(zodToJsonSchema(a)).toEqual(zodToJsonSchema(b));
}

export function getZodTypeName(schema: z.ZodType) {
  const typedSchema = schema as ZodFirstPartySchemaTypes;
  const def = typedSchema._def;
  switch (def.typeName) {
    case 'ZodString':
      return 'string';
    case 'ZodNumber':
      return 'number';
    case 'ZodBoolean':
      return 'boolean';
    case 'ZodArray':
      return 'array';
    case 'ZodObject':
      return 'object';
    case 'ZodDate':
      return 'date';
    case 'ZodAny':
      return 'any';
    case 'ZodNull':
      return 'null';
    default:
      return 'unknown';
  }
}
