/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema } from '../..';
import { offeringBasedSchema } from './offering_based_schema';

describe('Helper: offeringBasedSchema()', () => {
  describe('Example: Only allow the setting on Serverless', () => {
    const validation = schema.object({
      myProp: offeringBasedSchema({ serverless: schema.boolean({ defaultValue: true }) }),
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

  describe('Example: Only allow the setting on Traditional', () => {
    const validation = schema.object({
      myProp: offeringBasedSchema({ traditional: schema.boolean({ defaultValue: true }) }),
    });

    test('it uses the non-serverless validation when the context is not present', () => {
      expect(validation.validate({})).toEqual({ myProp: true });
    });

    test('it uses the non-serverless validation when context claims "not in serverless"', () => {
      expect(validation.validate({}, { serverless: false })).toEqual({ myProp: true });
    });

    test('it uses serverless validation when context claims "in serverless"', () => {
      expect(validation.validate({}, { serverless: true })).toEqual({});
    });

    test('it allows changing the flag when context claims "not in serverless"', () => {
      expect(validation.validate({ myProp: false }, { serverless: false })).toEqual({
        myProp: false,
      });
    });

    test('it does not allow changing the flag when context claims "in serverless"', () => {
      expect(() =>
        validation.validate({ myProp: true }, { serverless: true })
      ).toThrowErrorMatchingInlineSnapshot(`"[myProp]: a value wasn't expected to be present"`);
    });
  });

  describe('Example: Fixed setting on Traditional, configurable on Serverless', () => {
    const validation = schema.object({
      myProp: offeringBasedSchema({
        serverless: schema.boolean({ defaultValue: true }),
        options: { defaultValue: false },
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
      ).toThrowErrorMatchingInlineSnapshot(`"[myProp]: a value wasn't expected to be present"`);
    });

    test('it allows changing the flag when context claims "in serverless"', () => {
      expect(validation.validate({ myProp: false }, { serverless: true })).toEqual({
        myProp: false,
      });
    });
  });

  describe('Example: Fixed setting on Traditional (though settable), configurable on Serverless', () => {
    const validation = schema.object({
      myProp: offeringBasedSchema({
        serverless: schema.boolean({ defaultValue: true }),
        traditional: schema.literal(false),
        options: { defaultValue: false },
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

  describe('Example: Fixed setting on Serverless (though settable), configurable on Traditional', () => {
    const validation = schema.object({
      myProp: offeringBasedSchema({
        serverless: schema.literal(false),
        traditional: schema.boolean({ defaultValue: true }),
        options: { defaultValue: false },
      }),
    });

    test('it uses the non-serverless validation when the context is not present', () => {
      expect(validation.validate({})).toEqual({ myProp: true });
    });

    test('it uses the non-serverless validation when context claims "not in serverless"', () => {
      expect(validation.validate({}, { serverless: false })).toEqual({ myProp: true });
    });

    test('it uses serverless validation when context claims "in serverless"', () => {
      expect(validation.validate({}, { serverless: true })).toEqual({ myProp: false });
    });

    test('it allows changing the flag when context claims "not in serverless"', () => {
      expect(validation.validate({ myProp: false }, { serverless: false })).toEqual({
        myProp: false,
      });
    });

    test('it does not allow changing the flag when context claims "in serverless"', () => {
      expect(() =>
        validation.validate({ myProp: true }, { serverless: true })
      ).toThrowErrorMatchingInlineSnapshot(`"[myProp]: expected value to equal [false]"`);
    });
  });

  describe('Example: Setting is changeable on all offerings but with different defaults', () => {
    const validation = schema.object({
      myProp: offeringBasedSchema({
        serverless: schema.boolean({ defaultValue: true }),
        traditional: schema.boolean({ defaultValue: false }),
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
      myProp: offeringBasedSchema({
        serverless: schema.boolean({ defaultValue: true }),
        // @ts-expect-error
        traditional: schema.string({ defaultValue: 'not on serverless' }),
      }),
    });
  });
});
