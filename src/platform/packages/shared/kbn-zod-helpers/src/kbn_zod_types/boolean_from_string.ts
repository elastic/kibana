/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as z from '@kbn/zod';
import { type KbnZodType, KbnZodTypes } from './kbn_zod_type';

/**
 * This is a helper schema to convert a boolean string ("true" or "false") to a
 * boolean. Useful for processing query params.
 *
 * Accepts "true" or "false" as strings, or a boolean.
 */
export const BooleanFromString = z
  .union([z.literal('true'), z.literal('false'), z.boolean()])
  .transform((val) => {
    if (typeof val === 'string') {
      return val === 'true';
    }
    return val;
  })
  .meta({ kbnTypeName: KbnZodTypes.BooleanFromString })
  .describe("A boolean value, which can be 'true' or 'false' as string or a native boolean.");

// Infer the exact type of the `PassThroughAny` schema instance
type KbnZodBooleanFromString = typeof BooleanFromString;

export const isBooleanFromString = (val: unknown): val is KbnZodBooleanFromString => {
  const zodSchema = val as z.ZodTypeAny;
  return (
    zodSchema instanceof z.ZodUnion &&
    (zodSchema.meta() as Record<string, any> as KbnZodType)?.kbnTypeName ===
      KbnZodTypes.BooleanFromString
  );
};
