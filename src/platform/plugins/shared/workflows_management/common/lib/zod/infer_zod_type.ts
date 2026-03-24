/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';

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
