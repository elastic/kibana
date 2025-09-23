/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '../..';

enum Status {
  PENDING = 'pending',
  WAITING = 'waiting',
  COMPLETED = 'completed',
}

const myEnums = ['foo', 'bar', 'baz'] as const;

describe('schema.enum', () => {
  test('returns enum string value when passed string', () => {
    const type = schema.enum(myEnums);
    expect(type.validate('foo')).toBe('foo');
  });

  test('returns enum string value when passed value from enum', () => {
    const type = schema.enum<Status>(Status);
    expect(type.validate(Status.PENDING)).toBe(Status.PENDING);
  });

  test('returns null if wrapped in nullable for undefined', () => {
    const type = schema.nullable(schema.enum(myEnums));
    expect(type.validate(undefined)).toBe(null);
  });

  test('returns default value if provided', () => {
    const type = schema.enum(myEnums, {
      defaultValue: 'foo',
    });

    expect(type.validate(undefined)).toBe('foo');
  });

  test('validates basic type', () => {
    const type = schema.enum(myEnums);

    expect(() => type.validate('bad')).toThrowErrorMatchingInlineSnapshot(`
      "types that failed validation:
      - [0]: expected value to equal [foo]
      - [1]: expected value to equal [bar]
      - [2]: expected value to equal [baz]"
    `);
  });

  test('validates enum type', () => {
    const type = schema.enum(Status);

    expect(() => type.validate('bad')).toThrowErrorMatchingInlineSnapshot(`
      "types that failed validation:
      - [0]: expected value to equal [pending]
      - [1]: expected value to equal [waiting]
      - [2]: expected value to equal [completed]"
    `);
  });

  test('validates type in object', () => {
    const type = schema.object({
      enum1: schema.enum(myEnums),
      enum2: schema.enum(myEnums, { defaultValue: 'bar' }),
    });

    expect(type.validate({ enum1: 'foo' })).toEqual({ enum1: 'foo', enum2: 'bar' });
    expect(type.validate({ enum1: 'foo', enum2: 'baz' })).toEqual({ enum1: 'foo', enum2: 'baz' });
  });

  test('validates type errors in object', () => {
    const type = schema.object({
      enum: schema.enum(myEnums),
    });

    expect(() => type.validate({ enum: 'not-an-enum' })).toThrowErrorMatchingInlineSnapshot(`
      "[enum]: types that failed validation:
      - [enum.0]: expected value to equal [foo]
      - [enum.1]: expected value to equal [bar]
      - [enum.2]: expected value to equal [baz]"
    `);
  });
});
