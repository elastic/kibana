/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ZodType } from '@kbn/zod/v4';
import { z } from '@kbn/zod/v4';

export function parsePath(path: string) {
  const segments = path
    .replace(/\[(['"]?)([^\]]+)\1\]/g, '.$2') // Convert [key] to .key
    .split('.');
  return segments.some((s) => s === '') ? null : segments;
}

interface GetSchemaAtPathResult {
  schema: ZodType | null;
  scopedToPath: string | null;
}

/**
 * Get zod schema at a given path.
 * @param schema - The zod schema to get the path from.
 * @param path - The path to get the schema from. e.g. `choices[0].message['content']`
 * @param options - The options for the function.
 * @param options.partial - If true, return the schema for the last valid path segment.
 * @returns The schema at the given path or null if the path is invalid.
 */
// eslint-disable-next-line complexity
export function getSchemaAtPath(
  schema: ZodType,
  path: string,
  { partial = false }: { partial?: boolean } = {}
): GetSchemaAtPathResult {
  try {
    const segments = parsePath(path);
    if (!segments) {
      return { schema: null, scopedToPath: null };
    }

    let current: ZodType = schema;

    for (const [index, segment] of segments.entries()) {
      if (current instanceof z.ZodOptional) {
        current = current.unwrap();
      }
      if (current instanceof z.ZodDefault) {
        current = current.removeDefault();
      }
      if (current instanceof z.ZodObject) {
        const shape = current.shape;
        if (!(segment in shape)) {
          return partial
            ? { schema: current, scopedToPath: segments.slice(0, index).join('.') }
            : { schema: null, scopedToPath: null };
        }
        current = shape[segment];
      } else if (current instanceof z.ZodUnion) {
        const branches = current.options;
        const validBranch = branches.find((branch: z.ZodType) =>
          isValidSchemaPath(branch, segment)
        );
        if (!validBranch) {
          return partial
            ? { schema: current, scopedToPath: segments.slice(0, index).join('.') }
            : { schema: null, scopedToPath: null };
        }
        current = validBranch;
      } else if (current instanceof z.ZodArray) {
        if (!/^\d+$/.test(segment)) {
          return partial
            ? { schema: current, scopedToPath: segments.slice(0, index).join('.') }
            : { schema: null, scopedToPath: null };
        }
        const arrayIndex = parseInt(segment, 10);

        // Reject negative indices
        if (arrayIndex < 0) {
          return partial
            ? { schema: current, scopedToPath: segments.slice(0, index).join('.') }
            : { schema: null, scopedToPath: null };
        }

        // TODO: find out if zodv4 has a way to get the max length of an array
        // Only enforce bounds checking for arrays with explicit length constraints
        // const maxLength = current._def.maxLength?.value ?? current._def.exactLength?.value;
        // if (maxLength !== undefined && arrayIndex >= maxLength) {
        //   return partial
        //     ? { schema: current, scopedToPath: segments.slice(0, index).join('.') }
        //     : { schema: null, scopedToPath: null };
        // }

        // For unconstrained arrays, we allow any non-negative index for schema introspection
        // This is because we're validating schema paths, not runtime data
        current = current.element;
      } else if (current instanceof z.ZodAny) {
        // pass through any to preserve the description
        return { schema: current, scopedToPath: segments.slice(0, index).join('.') };
      } else if (current instanceof z.ZodUnknown) {
        // pass through unknown to preserve the description
        return { schema: current, scopedToPath: segments.slice(0, index).join('.') };
      } else {
        return { schema: null, scopedToPath: null };
      }
    }

    if (current instanceof z.ZodOptional || current instanceof z.ZodDefault) {
      return { schema: current.unwrap() as ZodType, scopedToPath: segments.join('.') };
    }

    return { schema: current as ZodType, scopedToPath: segments.join('.') };
  } catch {
    return { schema: null, scopedToPath: null };
  }
}

/**
 * Check if a path is valid for a given zod schema.
 * @param schema - The zod schema to check the path for.
 * @param path - The path to check. e.g. `choices[0].message['content']`
 * @returns True if the path is valid, false otherwise.
 */
export function isValidSchemaPath(schema: z.ZodType, path: string) {
  return getSchemaAtPath(schema, path).schema !== null;
}

/**
 * Infer a zod schema from an object.
 * @param obj - The object to infer the schema from.
 * @param isConst - If true, the schema will use a literal instead of the inferred type.
 * @returns The inferred zod schema.
 */
export function inferZodType(
  obj: unknown,
  { isConst = false }: { isConst?: boolean } = {}
): z.ZodType {
  if (obj === null) return z.null();
  if (obj === undefined) return z.undefined();

  const type = typeof obj;

  if (type === 'string') {
    if (isConst) {
      return z.literal(obj as string);
    }
    return z.string();
  }
  if (type === 'number') {
    if (isConst) {
      return z.literal(obj as number);
    }
    return z.number();
  }
  if (type === 'boolean') {
    if (isConst) {
      return z.literal(obj as boolean);
    }
    return z.boolean();
  }

  if (Array.isArray(obj)) {
    if (obj.length === 0) return z.array(z.unknown());
    const first = obj[0] as unknown;
    return z.array(inferZodType(first, { isConst })).length(obj.length);
  }

  if (type === 'object') {
    const shape: Record<string, z.ZodSchema> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      shape[key] = inferZodType(value, { isConst });
    }
    return z.object(shape);
  }

  return z.unknown();
}

export function expectZodSchemaEqual(a: z.ZodType, b: z.ZodType) {
  expect(z.toJSONSchema(a)).toEqual(z.toJSONSchema(b));
}

/**
 * Get the string representation of the zod schema type
 * @param schema - The zod schema to get the name of.
 * @param depth - The depth of the schema.
 * @returns String representation of the zod schema type, unwrapping optional and default wrappers and resolving literals to their value.
 * @private
 */
function getZodTypeNameRecursively(schema: z.ZodType, depth: number = 0) {
  if (depth > 10) {
    return 'unknown';
  }
  if (schema instanceof z.ZodOptional || schema instanceof z.ZodDefault) {
    return getZodTypeNameRecursively(schema.unwrap() as ZodType, depth + 1);
  }
  const def = schema.def;
  switch (def.type) {
    case 'union': {
      // Check if all union members are arrays - if so, treat as array type
      const unionSchema = schema as z.ZodUnion<[z.ZodType, ...z.ZodType[]]>;
      const allMembersAreArrays = unionSchema.options.every(
        (option: z.ZodType) => option instanceof z.ZodArray
      );
      if (allMembersAreArrays) {
        return 'array';
      }
      return 'union';
    }
    default:
      return def.type;
  }
}

export function getZodTypeName(schema: z.ZodType): string {
  return getZodTypeNameRecursively(schema);
}
