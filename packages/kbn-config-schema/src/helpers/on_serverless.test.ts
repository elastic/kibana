/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema } from '../..';
import { onServerless } from './on_serverless';

describe('Helper: onServerless()', () => {
  describe('Example: Only allow the setting on Serverless', () => {
    const validation = schema.object({
      myProp: onServerless(schema.boolean({ defaultValue: true })),
    });

    test('it uses the non-serverless validation when the context is not present', () => {
      expect(validation.validate({})).toEqual({});
    });

    test('it uses the non-serverless validation when context claims "not in serverless"', () => {
      expect(validation.validate({}, { serverless: false })).toEqual({});
    });

    test('it uses serverless validation when context claims "in serverless"', () => {
      expect(validation.validate({}, { serverless: true })).toEqual({ myProp: true });
    });

    test('it does not allow changing the flag when context claims "not in serverless"', () => {
      expect(() =>
        validation.validate({ myProp: true }, { serverless: false })
      ).toThrowErrorMatchingInlineSnapshot(`"[myProp]: a value wasn't expected to be present"`);
    });

    test('it allows changing the flag when context claims "in serverless"', () => {
      expect(validation.validate({ myProp: false }, { serverless: true })).toEqual({
        myProp: false,
      });
    });
  });

  describe('Example: Fixed setting on self-managed, configurable on Serverless', () => {
    const validation = schema.object({
      myProp: onServerless(schema.boolean({ defaultValue: true }), schema.literal(false), {
        defaultValue: false,
      }),
    });

    test('it uses the non-serverless validation when the context is not present', () => {
      expect(validation.validate({})).toEqual({ myProp: false });
    });

    test('it uses the non-serverless validation when context claims "not in serverless"', () => {
      expect(validation.validate({}, { serverless: false })).toEqual({ myProp: false });
    });

    test('it uses serverless validation when context claims "in serverless"', () => {
      expect(validation.validate({}, { serverless: true })).toEqual({ myProp: true });
    });

    test('it does not allow changing the flag when context claims "not in serverless"', () => {
      expect(() =>
        validation.validate({ myProp: true }, { serverless: false })
      ).toThrowErrorMatchingInlineSnapshot(`"[myProp]: expected value to equal [false]"`);
    });

    test('it allows changing the flag when context claims "in serverless"', () => {
      expect(validation.validate({ myProp: false }, { serverless: true })).toEqual({
        myProp: false,
      });
    });
  });

  describe('Example: Setting is changeable on all offerings but with different defaults', () => {
    const validation = schema.object({
      myProp: onServerless(
        schema.boolean({ defaultValue: true }),
        schema.boolean({ defaultValue: false })
      ),
    });

    test('it uses the non-serverless validation when the context is not present', () => {
      expect(validation.validate({})).toEqual({ myProp: false });
    });

    test('it uses the non-serverless validation when context claims "not in serverless"', () => {
      expect(validation.validate({}, { serverless: false })).toEqual({ myProp: false });
    });

    test('it uses serverless validation when context claims "in serverless"', () => {
      expect(validation.validate({}, { serverless: true })).toEqual({ myProp: true });
    });

    test('it allows changing the flag when context claims "not in serverless"', () => {
      expect(validation.validate({ myProp: true }, { serverless: false })).toEqual({
        myProp: true,
      });
    });

    test('it allows changing the flag when context claims "in serverless"', () => {
      expect(validation.validate({ myProp: false }, { serverless: true })).toEqual({
        myProp: false,
      });
    });
  });

  test('TS enforces the same types on both entries', () => {
    schema.object({
      myProp: onServerless(
        schema.boolean({ defaultValue: true }),
        // @ts-expect-error
        schema.string({ defaultValue: 'not on serverless' })
      ),
    });
  });
});
