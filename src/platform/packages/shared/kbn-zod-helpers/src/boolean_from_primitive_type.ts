/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as z from '@kbn/zod';

// A helper to check if a value is a primitive.
function isPrimitive(value: unknown): value is string | number | boolean | null | undefined {
  return (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    value === null ||
    value === undefined
  );
}

// This is a helper schema to convert a primitive type value to a boolean.
export const BooleanFromPrimitiveType: z.ZodEffects<z.ZodType<unknown>, boolean> = z.preprocess(
  (input) => {
    if (!isPrimitive(input)) {
      return undefined;
    }

    if (typeof input === 'string') {
      return input === 'true';
    }

    return Boolean(input);
  },
  z.boolean()
);
