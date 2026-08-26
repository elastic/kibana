/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import { z } from '@kbn/zod/v4';

import { validateObj, validateVersion } from './utils';

describe('utils', () => {
  describe('validateObj()', () => {
    test('returns null for config-schema when valid', () => {
      const err = validateObj('a', schema.string());
      expect(err).toBe(null);
    });

    test('returns ValidationError for config-schema when invalid', () => {
      const err = validateObj(1, schema.string());
      expect(err).toBeInstanceOf(Error);
      expect(err?.message).toContain('string');
    });

    test('returns null for Zod when valid', () => {
      const err = validateObj({ a: 1 }, z.object({ a: z.number() }));
      expect(err).toBe(null);
    });

    test('returns Error with prettified message for Zod when invalid', () => {
      const err = validateObj({ a: 'x' }, z.object({ a: z.number() }));
      expect(err).toBeInstanceOf(Error);
      expect(err?.message).toMatchInlineSnapshot(`
        "✖ Invalid input: expected number, received string
          → at a"
      `);
    });

    test('returns Error when schema is neither config-schema nor Zod', () => {
      const err = validateObj({}, {} as any);
      expect(err).toBeInstanceOf(Error);
      expect(err?.message).toBe('Invalid schema type.');
    });
  });

  describe('validateVersion()', () => {
    [
      { input: '123', isValid: true, expected: 123 },
      { input: '1111111111111111111111111', isValid: true, expected: 1111111111111111111111111 },
      { input: '111111111111.1111111111111', isValid: false, expected: null },
      { input: 123, isValid: true, expected: 123 },
      { input: 1.23, isValid: false, expected: null },
      { input: '123a', isValid: false, expected: null },
      { input: 'abc', isValid: false, expected: null },
      { input: undefined, isValid: false, expected: null },
      { input: null, isValid: false, expected: null },
      { input: [123], isValid: false, expected: null },
      { input: { 123: true }, isValid: false, expected: null },
      { input: () => 123, isValid: false, expected: null },
    ].forEach(({ input, expected, isValid }) => {
      test(`validate: [${input}]`, () => {
        const { result, value } = validateVersion(input);
        expect(result).toBe(isValid);
        expect(value).toBe(expected);
      });
    });
  });
});
