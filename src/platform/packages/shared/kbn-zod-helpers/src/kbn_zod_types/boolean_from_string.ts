/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as z from '@kbn/zod';
import type { KbnZodType } from './kbn_zod_type';
import { KbnZodTypes } from './kbn_zod_type';

/**
 * This is a helper schema to convert a boolean string ("true" or "false") to a
 * boolean. Useful for processing query params.
 *
 * Accepts "true" or "false" as strings, or a boolean.
 */
type KbnZodBooleanFromString = z.ZodType<boolean, 'true' | 'false' | boolean> & KbnZodType;

function createBooleanFromString(): KbnZodBooleanFromString {
  const schema = z
    .union([z.enum(['true', 'false']), z.boolean()])
    .transform((val) => (val === 'true' ? true : val === 'false' ? false : val))
    .describe("A boolean value, which can be 'true' or 'false' as string or a native boolean.");

  return Object.assign(schema, {
    kbnTypeName: KbnZodTypes.BooleanFromString as const,
  }) as unknown as KbnZodBooleanFromString;
}

export const BooleanFromString = createBooleanFromString();

export const isBooleanFromString = (val: unknown): val is KbnZodBooleanFromString => {
  return (val as KbnZodBooleanFromString).kbnTypeName === KbnZodTypes.BooleanFromString;
};
