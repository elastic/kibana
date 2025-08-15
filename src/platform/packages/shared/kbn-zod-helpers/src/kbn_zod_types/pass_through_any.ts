/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as z from '@kbn/zod';
import { KbnZodType, KbnZodTypes } from './kbn_zod_type';

/**
 * This is a helper schema to pass through any value without validation.
 * KbnZodTypes.PassThroughAny heps identify that it is a deliberate pass through of any value without validation.
 */
export const PassThroughAny = z
  .any()
  .meta({ kbnTypeName: KbnZodTypes.PassThroughAny })
  .describe('Pass through any value without validation.');

// Infer the exact type of the `PassThroughAny` schema instance
type KbnPassThroughAny = typeof PassThroughAny;

export const isPassThroughAny = (val: unknown): val is KbnPassThroughAny => {
  // Cast `val` to `z.ZodTypeAny` to safely access `.meta()`
  const zodSchema = val as z.ZodTypeAny;

  return (
    zodSchema instanceof z.ZodAny && // Ensure it's an 'any' schema
    (zodSchema.meta() as Record<string, any> as KbnZodType)?.kbnTypeName ===
      KbnZodTypes.PassThroughAny
  );
};
