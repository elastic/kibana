/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as z from '@kbn/zod/v4';
import { KbnZodTypes } from './kbn_zod_type';

/**
 * This is a helper schema to convert a boolean string ("true" or "false") to a
 * boolean. Useful for processing query params.
 *
 * Accepts "true" or "false" as strings, or a boolean.
 */
const booleanFromStringSchema = z
  .union([z.enum(['true', 'false']), z.boolean()])
  .transform((val): boolean => (val === 'true' ? true : val === 'false' ? false : val))
  .describe("A boolean value, which can be 'true' or 'false' as string or a native boolean.");

type BooleanFromStringSchema = typeof booleanFromStringSchema & {
  readonly kbnTypeName: KbnZodTypes.BooleanFromString;
};

export const BooleanFromString: BooleanFromStringSchema = Object.assign(booleanFromStringSchema, {
  kbnTypeName: KbnZodTypes.BooleanFromString as const,
});

export const isBooleanFromString = (val: unknown): val is BooleanFromStringSchema => {
  return (val as BooleanFromStringSchema).kbnTypeName === KbnZodTypes.BooleanFromString;
};
