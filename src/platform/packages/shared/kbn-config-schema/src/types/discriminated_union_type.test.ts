/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { expectType } from 'tsd';

import type { TypeOf } from '../..';
import { schema } from '../..';

describe('DiscriminatedUnionType', () => {
  const exampleType = schema.oneOfKind('type', [
    schema.object({ type: schema.literal('str'), string: schema.string() }),
    schema.object({ type: schema.literal('num'), number: schema.number() }),
    schema.object({ type: schema.literal('bool'), boolean: schema.boolean() }),
  ]);

  it('should validate first type', () => {
    const input = { type: 'str', string: 'test' };
    expect(exampleType.validate(input)).toEqual(input);
  });

  it('should validate second type', () => {
    const input = { type: 'num', number: 123 };
    expect(exampleType.validate(input)).toEqual(input);
  });

  it('should validate third type', () => {
    const input = { type: 'bool', boolean: true };
    expect(exampleType.validate(input)).toEqual(input);
  });

  it('should validate with default', () => {
    const type = schema.oneOfKind(
      'type',
      [
        schema.object({ type: schema.literal('str'), string: schema.string() }),
        schema.object({ type: schema.literal('num'), number: schema.number() }),
        schema.object({ type: schema.literal('bool'), boolean: schema.boolean() }),
      ],
      { defaultValue: { type: 'str', string: 'test' } }
    );

    expect(type.validate(undefined)).toEqual({ type: 'str', string: 'test' });
  });

  describe('error validation', () => {
    it('should handle missing discriminator', () => {
      expect(() => exampleType.validate({})).toThrowErrorMatchingInlineSnapshot(
        `"\\"type\\" property is required"`
      );
    });

    it('should handle invalid discriminator type', () => {
      expect(() =>
        exampleType.validate({ type: 1, string: 'foo' })
      ).toThrowErrorMatchingInlineSnapshot(
        `"expected \\"type\\" to be a string of [\\"str\\", \\"num\\", \\"bool\\"] but got [number]"`
      );
    });

    it('should handle invalid discriminator value', () => {
      expect(() =>
        exampleType.validate({ type: 'invalid', string: 'foo' })
      ).toThrowErrorMatchingInlineSnapshot(
        `"expected \\"type\\" to be one of [\\"str\\", \\"num\\", \\"bool\\"] but got [\\"invalid\\"]"`
      );
    });

    it('should handle nested errors', () => {
      const type = schema.object({
        test: schema.string(),
        nested: exampleType,
      });
      expect(() =>
        type.validate({ test: 'test', nested: { type: 'invalid', string: 'foo' } })
      ).toThrowErrorMatchingInlineSnapshot(
        `"[nested]: expected \\"type\\" to be one of [\\"str\\", \\"num\\", \\"bool\\"] but got [\\"invalid\\"]"`
      );
    });

    it('should handle validation only based on discriminator type schema', () => {
      expect(() =>
        exampleType.validate({ type: 'str', string: 123 })
      ).toThrowErrorMatchingInlineSnapshot(
        `"[string]: expected value of type [string] but got [number]"`
      );
    });
  });

  describe('schema config errors', () => {
    // We cannot type the discriminator to be a `LiteralType` as `schema.literal('a')` returns `Type<'a'>`
    it('should throw if discriminator type is not a literal', () => {
      expect(() => {
        schema.oneOfKind('type', [
          schema.object({ type: schema.string(), string: schema.string() }),
        ]);
      }).toThrowErrorMatchingInlineSnapshot(
        `"Discriminator for schema at index 0 must be a literal type, got string type"`
      );
    });
  });

  describe('#extendsDeep', () => {
    it('objects with unknown attributes are kept when extending with unknowns=allow', () => {
      const allowSchema = exampleType.extendsDeep({ unknowns: 'allow' });
      const input = { type: 'str', string: 'test', unknown: 'thing' };
      expect(allowSchema.validate(input)).toEqual(input);
    });

    it('objects with unknown attributes are dropped when extending with unknowns=ignore', () => {
      const ignoreSchema = exampleType.extendsDeep({ unknowns: 'ignore' });
      const input = { type: 'str', string: 'test' };
      expect(ignoreSchema.validate({ ...input, unknown: 'thing' })).toEqual(input);
    });

    it('objects with unknown attributes fail validation when extending with unknowns=forbid', () => {
      const forbidSchema = exampleType.extendsDeep({ unknowns: 'forbid' });
      const input = { type: 'str', string: 'test' };
      expect(() =>
        forbidSchema.validate({ ...input, unknown: 'thing' })
      ).toThrowErrorMatchingInlineSnapshot(`"[unknown]: definition for this key is missing"`);
    });
  });

  describe('types', () => {
    type ExampleType = TypeOf<typeof exampleType>;

    test('should validate correct types', () => {
      expectType<ExampleType>({ type: 'str', string: 'test' });
      expectType<ExampleType>({ type: 'num', number: 123 });
      expectType<ExampleType>({ type: 'bool', boolean: true });
    });

    test('should validate incorrect types', () => {
      // @ts-expect-error - should a string
      expectType<ExampleType>({ type: 'str', string: 123 });
      // @ts-expect-error - should a number
      expectType<ExampleType>({ type: 'num', number: 'test' });
      // @ts-expect-error - should a boolean
      expectType<ExampleType>({ type: 'bool', boolean: 'true' });
    });
  });
});
