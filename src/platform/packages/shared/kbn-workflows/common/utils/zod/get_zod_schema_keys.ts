/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ZodType } from '@kbn/zod/v4';
import { ZodIntersection, ZodObject, ZodUnion } from '@kbn/zod/v4';

/**
 * Returns the keys of a flattened zod schema.
 * @param schemaParam - The zod schema to get the keys of.
 * @returns The keys of the zod schema.
 */
export const getZodSchemaKeys = (schemaParam: ZodType): string[] => {
  if (schemaParam instanceof ZodObject) {
    // ZodObject
    return Object.keys(schemaParam.def.shape);
  } else if (schemaParam instanceof ZodIntersection) {
    // ZodIntersection - combine keys from both sides
    const leftKeys = getZodSchemaKeys(schemaParam.def.left as ZodType);
    const rightKeys = getZodSchemaKeys(schemaParam.def.right as ZodType);
    return [...leftKeys, ...rightKeys];
  } else if (schemaParam instanceof ZodUnion) {
    // ZodUnion - get keys from all options
    const allKeys = new Set<string>();
    schemaParam.options.forEach((option) => {
      getZodSchemaKeys(option as ZodType).forEach((key: string) => allKeys.add(key));
    });
    return Array.from(allKeys);
  }
  return [];
};
