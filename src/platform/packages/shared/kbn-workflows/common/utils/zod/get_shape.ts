/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';

export function getShape(schema: z.ZodType): Record<string, z.ZodType> {
  let current: unknown = schema;
  if (current instanceof z.ZodOptional) {
    current = current.unwrap();
  }
  if (current instanceof z.ZodIntersection) {
    return {
      ...getShape(current.def.left as z.ZodType),
      ...getShape(current.def.right as z.ZodType),
    };
  }
  if (current instanceof z.ZodUnion) {
    return current.options.reduce((acc, option) => {
      return { ...acc, ...getShape(option as z.ZodType) };
    }, {});
  }
  if (current instanceof z.ZodNever) {
    return {};
  }
  if (current instanceof z.ZodObject) {
    return current.shape;
  }
  return {};
}
