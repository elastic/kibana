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
 * Peel `optional` / `default` / `nullable` / `lazy` wrappers until reaching the inner type that
 * describes the value. Peeling `lazy` matters for the recursive workflow schemas — e.g.
 * `z.array(z.lazy(stepUnion))` only resolves to the union once the lazy wrapper is gone.
 */
export function unwrapSchema(schema: z.ZodType): z.ZodType {
  let current = schema;
  while (
    current instanceof z.ZodOptional ||
    current instanceof z.ZodDefault ||
    current instanceof z.ZodNullable ||
    current instanceof z.ZodLazy
  ) {
    current = current.unwrap() as z.ZodType;
  }
  return current;
}
