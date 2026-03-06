/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';
import type { KbnZodType } from './kbn_zod_type';
import { KbnZodTypes } from './kbn_zod_type';

/**
 * This is a helper schema to convert a boolean string ("true" or "false") to a
 * boolean. Useful for processing query params.
 *
 * Accepts "true" or "false" as strings, or a boolean.
 */
const _BooleanFromString = z
  .union([z.enum(['true', 'false']).transform((val) => val === 'true'), z.boolean()])
  .describe("A boolean value, which can be 'true' or 'false' as string or a native boolean.");

// Add custom type marker for identification
Object.defineProperty(_BooleanFromString, 'kbnTypeName', {
  value: KbnZodTypes.BooleanFromString,
  writable: false,
  enumerable: true,
});

export const BooleanFromString = _BooleanFromString as typeof _BooleanFromString & KbnZodType;

export const isBooleanFromString = (val: unknown): val is typeof BooleanFromString => {
  return (val as KbnZodType)?.kbnTypeName === KbnZodTypes.BooleanFromString;
};
