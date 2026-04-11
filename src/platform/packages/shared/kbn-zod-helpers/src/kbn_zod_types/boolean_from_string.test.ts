/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as z from '@kbn/zod';
import { BooleanFromString, isBooleanFromString } from './boolean_from_string';

describe('BooleanFromString', () => {
  it.each([
    ['true', true, 'string'],
    ['false', false, 'string'],
    [true, true, 'boolean'],
    [false, false, 'boolean'],
  ])('should return %s when input is %s of type %s', (input, expected, _type) => {
    expect(BooleanFromString.parse(input)).toBe(expected);
  });

  it('has the default description', () => {
    expect(BooleanFromString.description).toBe(
      "A boolean value, which can be 'true' or 'false' as string or a native boolean."
    );
  });

  it('has the correct zod and kbn type', () => {
    expect(BooleanFromString instanceof z.ZodUnion).toBe(true);
    expect(BooleanFromString._def.typeName).toBe(z.ZodFirstPartyTypeKind.ZodUnion);
    expect(isBooleanFromString(BooleanFromString)).toBe(true);
  });

  it('zod chaining works as expected', () => {
    const zodChain = BooleanFromString.optional().default(false).describe('test description');
    expect(zodChain.parse(undefined)).toBe(false);
    expect(zodChain.description).toBe('test description');
  });

  it('zod wrapping words as expected', () => {
    const zodSchema = z.optional(BooleanFromString).describe('wrapped with zod');
    expect(zodSchema.description).toBe('wrapped with zod');
  });

  it('should throw an error when input is not a boolean or "true" or "false"', () => {
    expect(() => BooleanFromString.parse('not a boolean')).toThrow();
    expect(() => BooleanFromString.parse(42)).toThrow();
  });
});
