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
 * This is a helper schema to convert a boolean string ("true" or "false") to a
 * boolean. Useful for processing query params.
 *
 * Accepts "true" or "false" as strings, or a boolean.
 */
class KbnZodBooleanFromString extends z.ZodUnion<any> implements KbnZodType {
  readonly kbnTypeName = KbnZodTypes.BooleanFromString;

  static create() {
    return new KbnZodBooleanFromString({
      typeName: z.ZodFirstPartyTypeKind.ZodUnion,
      options: [z.enum(['true', 'false']), z.boolean()],
    }).describe("A boolean value, which can be 'true' or 'false' as string or a native boolean.");
  }

  override _parse(input: z.ParseInput): z.ParseReturnType<this['_output']> {
    const result = super._parse(input); // Use ZodUnion's default parsing

    if (z.isValid(result)) {
      const value = result.value;
      return {
        status: 'valid',
        value: value === 'true' ? true : value === 'false' ? false : value,
      };
    }

    return result;
  }
}

export const BooleanFromString = KbnZodBooleanFromString.create();

export const isBooleanFromString = (val: unknown): val is KbnZodBooleanFromString => {
  return (val as KbnZodBooleanFromString).kbnTypeName === KbnZodTypes.BooleanFromString;
};
