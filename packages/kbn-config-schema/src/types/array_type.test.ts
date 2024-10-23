/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '../..';

test('returns value if it matches the type', () => {
  const type = schema.arrayOf(schema.string());
  expect(type.validate(['foo', 'bar', 'baz'])).toEqual(['foo', 'bar', 'baz']);
});

test('properly parse the value if input is a string', () => {
  const type = schema.arrayOf(schema.string());
  expect(type.validate('["foo", "bar", "baz"]')).toEqual(['foo', 'bar', 'baz']);
});

test('fails if wrong input type', () => {
  const type = schema.arrayOf(schema.string());
  expect(() => type.validate(12)).toThrowErrorMatchingInlineSnapshot(
    `"expected value of type [array] but got [number]"`
  );
});

test('fails if string input cannot be parsed', () => {
  const type = schema.arrayOf(schema.string());
  expect(() => type.validate('test')).toThrowErrorMatchingInlineSnapshot(
    `"could not parse array value from json input"`
  );
});

test('fails with correct type if parsed input is not an array', () => {
  const type = schema.arrayOf(schema.string());
  expect(() => type.validate('{"foo": "bar"}')).toThrowErrorMatchingInlineSnapshot(
    `"expected value of type [array] but got [Object]"`
  );
});

test('includes namespace in failure when wrong top-level type', () => {
  const type = schema.arrayOf(schema.string());
  expect(() => type.validate('test', {}, 'foo-namespace')).toThrowErrorMatchingInlineSnapshot(
    `"[foo-namespace]: could not parse array value from json input"`
  );
});

test('includes namespace in failure when wrong item type', () => {
  const type = schema.arrayOf(schema.string());
  expect(() => type.validate([123], {}, 'foo-namespace')).toThrowErrorMatchingInlineSnapshot(
    `"[foo-namespace.0]: expected value of type [string] but got [number]"`
  );
});

test('fails if wrong type of content in array', () => {
  const type = schema.arrayOf(schema.string());
  expect(() => type.validate([1, 2, 3])).toThrowErrorMatchingInlineSnapshot(
    `"[0]: expected value of type [string] but got [number]"`
  );
});

test('fails when parsing if wrong type of content in array', () => {
  const type = schema.arrayOf(schema.string());
  expect(() => type.validate('[1, 2, 3]')).toThrowErrorMatchingInlineSnapshot(
    `"[0]: expected value of type [string] but got [number]"`
  );
});

test('fails if mixed types of content in array', () => {
  const type = schema.arrayOf(schema.string());
  expect(() => type.validate(['foo', 'bar', true, {}])).toThrowErrorMatchingInlineSnapshot(
    `"[2]: expected value of type [string] but got [boolean]"`
  );
});

test('fails if sparse content in array', () => {
  const type = schema.arrayOf(schema.string());
  expect(type.validate([])).toEqual([]);
  expect(() => type.validate([undefined])).toThrowErrorMatchingInlineSnapshot(
    `"[0]: sparse array are not allowed"`
  );
});

test('fails if sparse content in array if optional', () => {
  const type = schema.arrayOf(schema.maybe(schema.string()));
  expect(type.validate([])).toEqual([]);
  expect(() => type.validate([undefined])).toThrowErrorMatchingInlineSnapshot(
    `"[0]: sparse array are not allowed"`
  );
});

test('fails if sparse content in array if nullable', () => {
  const type = schema.arrayOf(schema.nullable(schema.string()));
  expect(type.validate([])).toEqual([]);
  expect(type.validate([null])).toEqual([null]);
  expect(() => type.validate([undefined])).toThrowErrorMatchingInlineSnapshot(
    `"[0]: sparse array are not allowed"`
  );
});

test('fails for null values if optional', () => {
  const type = schema.arrayOf(schema.maybe(schema.string()));
  expect(() => type.validate([null])).toThrowErrorMatchingInlineSnapshot(
    `"[0]: expected value of type [string] but got [null]"`
  );
});

test('returns empty array if input is empty but type has default value', () => {
  const type = schema.arrayOf(schema.string({ defaultValue: 'test' }));
  expect(type.validate([])).toEqual([]);
});

test('returns empty array if input is empty even if type is required', () => {
  const type = schema.arrayOf(schema.string());
  expect(type.validate([])).toEqual([]);
});

test('handles default values for undefined values', () => {
  const type = schema.arrayOf(schema.string(), { defaultValue: ['foo'] });
  expect(type.validate(undefined)).toEqual(['foo']);
});

test('array within array', () => {
  const type = schema.arrayOf(
    schema.arrayOf(schema.string(), {
      maxSize: 2,
      minSize: 2,
    }),
    { minSize: 1, maxSize: 1 }
  );

  const value = [['foo', 'bar']];

  expect(type.validate(value)).toEqual([['foo', 'bar']]);
});

test('object within array', () => {
  const type = schema.arrayOf(
    schema.object({
      foo: schema.string({ defaultValue: 'foo' }),
    })
  );

  const value = [
    {
      foo: 'test',
    },
  ];

  expect(type.validate(value)).toEqual([{ foo: 'test' }]);
});

test('object within array with required', () => {
  const type = schema.arrayOf(
    schema.object({
      foo: schema.string(),
    })
  );

  const value = [{}];

  expect(() => type.validate(value)).toThrowErrorMatchingInlineSnapshot(
    `"[0.foo]: expected value of type [string] but got [undefined]"`
  );
});

describe('#minSize', () => {
  test('returns value when more items', () => {
    expect(schema.arrayOf(schema.string(), { minSize: 1 }).validate(['foo'])).toEqual(['foo']);
  });

  test('returns error when fewer items', () => {
    expect(() =>
      schema.arrayOf(schema.string(), { minSize: 2 }).validate(['foo'])
    ).toThrowErrorMatchingInlineSnapshot(`"array size is [1], but cannot be smaller than [2]"`);
  });
});

describe('#maxSize', () => {
  test('returns value when fewer items', () => {
    expect(schema.arrayOf(schema.string(), { maxSize: 2 }).validate(['foo'])).toEqual(['foo']);
  });

  test('returns error when more items', () => {
    expect(() =>
      schema.arrayOf(schema.string(), { maxSize: 1 }).validate(['foo', 'bar'])
    ).toThrowErrorMatchingInlineSnapshot(`"array size is [2], but cannot be greater than [1]"`);
  });
});

describe('#extendsDeep', () => {
  const type = schema.arrayOf(
    schema.object({
      foo: schema.string(),
    })
  );

  test('objects with unknown attributes are kept when extending with unknowns=allow', () => {
    const allowSchema = type.extendsDeep({ unknowns: 'allow' });
    const result = allowSchema.validate([{ foo: 'test', bar: 'test' }]);
    expect(result).toEqual([{ foo: 'test', bar: 'test' }]);
  });

  test('objects with unknown attributes are dropped when extending with unknowns=ignore', () => {
    const ignoreSchema = type.extendsDeep({ unknowns: 'ignore' });
    const result = ignoreSchema.validate([{ foo: 'test', bar: 'test' }]);
    expect(result).toEqual([{ foo: 'test' }]);
  });

  test('objects with unknown attributes fail validation when extending with unknowns=forbid', () => {
    const forbidSchema = type.extendsDeep({ unknowns: 'forbid' });
    expect(() =>
      forbidSchema.validate([{ foo: 'test', bar: 'test' }])
    ).toThrowErrorMatchingInlineSnapshot(`"[0.bar]: definition for this key is missing"`);
  });
});
