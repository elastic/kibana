/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';

// Helper function to get a parameter schema from different schema types
export const getZodParamSchema = (schema: z.ZodType, paramName: string): z.ZodType | undefined => {
  if (schema instanceof z.ZodObject) {
    // ZodObject
    return schema.shape[paramName];
  } else if (schema instanceof z.ZodIntersection) {
    // ZodIntersection - check both sides
    const leftParam = getZodParamSchema(schema.def.left as z.ZodType, paramName);
    const rightParam = getZodParamSchema(schema.def.right as z.ZodType, paramName);
    return leftParam || rightParam;
  } else if (schema instanceof z.ZodUnion) {
    // ZodUnion - check all options
    for (const option of schema.options) {
      const param = getZodParamSchema(option as z.ZodType, paramName);
      if (param) return param;
    }
  }
  return undefined;
};
