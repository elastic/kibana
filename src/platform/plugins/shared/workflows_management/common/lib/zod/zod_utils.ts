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
import type { $ZodCheckLengthEqualsDef, $ZodCheckMaxLengthDef } from '@kbn/zod/v4/core';

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
        current = current.unwrap() as ZodType;
      }
      if (current instanceof z.ZodDefault) {
        current = current.unwrap() as ZodType;
      }
      if (current instanceof z.ZodLazy) {
        current = current.unwrap() as ZodType;
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
        const validBranch = branches.find((branch) =>
          isValidSchemaPath(branch as z.ZodType, segment)
        );
        if (!validBranch) {
          return partial
            ? { schema: current, scopedToPath: segments.slice(0, index).join('.') }
            : { schema: null, scopedToPath: null };
        }
        // We found a valid branch, now we need to traverse into it with the current segment
        const branchResult = getSchemaAtPath(validBranch as ZodType, segment);
        if (!branchResult.schema) {
          return partial
            ? { schema: current, scopedToPath: segments.slice(0, index).join('.') }
            : { schema: null, scopedToPath: null };
        }
        current = branchResult.schema;
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

        // Check for array length constraints in Zod v4
        // Array constraints are stored in the checks array
        let maxLength: number | undefined;

        if (current.def.checks) {
          for (const check of current.def.checks) {
            if (check._zod?.def) {
              const checkDef = check._zod.def;
              if (checkDef.check === 'max_length') {
                maxLength = (checkDef as $ZodCheckMaxLengthDef).maximum;
              } else if (checkDef.check === 'length_equals') {
                maxLength = (checkDef as $ZodCheckLengthEqualsDef).length;
              }
            }
          }
        }

        // Only enforce bounds checking for arrays with explicit length constraints
        if (maxLength !== undefined && arrayIndex >= maxLength) {
          return partial
            ? { schema: current, scopedToPath: segments.slice(0, index).join('.') }
            : { schema: null, scopedToPath: null };
        }

        // For unconstrained arrays, we allow any non-negative index for schema introspection
        // This is because we're validating schema paths, not runtime data
        current = current.element as ZodType;
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

const options: Parameters<typeof z.toJSONSchema>[1] = {
  target: 'draft-7',
  unrepresentable: 'any',
};
export function expectZodSchemaEqual(a: z.ZodType, b: z.ZodType) {
  expect(z.toJSONSchema(a, options)).toEqual(z.toJSONSchema(b, options));
}

export function getArrayDescription(arraySchema: z.ZodArray, depth: number = 0): string {
  const elementType = getZodTypeName(arraySchema.element as z.ZodType);
  if (elementType === 'array') {
    if (depth > 10) {
      return 'array[][]';
    }
    return getArrayDescription(arraySchema.element as z.ZodArray, depth + 1);
  }
  return `${elementType}[]`;
}

export function getUnionDescription(unionSchema: z.ZodUnion): string {
  // Check if all union members are arrays - if so, treat as array type
  const optionsTypes = unionSchema.options.map((option) => getZodTypeName(option as z.ZodType));
  if (new Set(optionsTypes).size === 1) {
    return optionsTypes[0];
  }
  return `(${optionsTypes.join(' | ')})`;
}

export function getEnumDescription(schema: z.ZodEnum): string {
  return schema.options.map((o) => `"${o}"`).join(' | ');
}

export function getLiteralDescription(schema: z.ZodLiteral): string {
  const literalValue = schema.value;
  return typeof literalValue === 'string' ? `"${literalValue}"` : String(literalValue);
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
  if (
    schema instanceof z.ZodOptional ||
    schema instanceof z.ZodDefault ||
    schema instanceof z.ZodLazy
  ) {
    return getZodTypeNameRecursively(schema.unwrap() as ZodType, depth + 1);
  }
  const def = schema.def;
  switch (def.type) {
    case 'array':
      return getArrayDescription(schema as z.ZodArray, depth + 1);
    case 'union':
      return getUnionDescription(schema as z.ZodUnion);
    case 'enum':
      return getEnumDescription(schema as z.ZodEnum);
    case 'literal':
      return getLiteralDescription(schema as z.ZodLiteral);
    default:
      return def.type;
  }
}

export function getZodTypeName(schema: z.ZodType): string {
  return getZodTypeNameRecursively(schema);
}
