/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema } from '../..';

test('returns value is string and defined', () => {
  expect(schema.string().validate('test')).toBe('test');
});

test('allows empty strings', () => {
  expect(schema.string().validate('')).toBe('');
});

test('is required by default', () => {
  expect(() => schema.string().validate(undefined)).toThrowErrorMatchingInlineSnapshot(
    `"expected value of type [string] but got [undefined]"`
  );
});

test('includes namespace in failure', () => {
  expect(() =>
    schema.string().validate(undefined, 'foo-namespace')
  ).toThrowErrorMatchingInlineSnapshot(
    `"[foo-namespace]: expected value of type [string] but got [undefined]"`
  );
});

test('returns error when not string', () => {
  expect(() => schema.string().validate(123)).toThrowErrorMatchingInlineSnapshot(
    `"expected value of type [string] but got [number]"`
  );

  expect(() => schema.string().validate([1, 2, 3])).toThrowErrorMatchingInlineSnapshot(
    `"expected value of type [string] but got [Array]"`
  );

  expect(() => schema.string().validate(/abc/)).toThrowErrorMatchingInlineSnapshot(
    `"expected value of type [string] but got [RegExp]"`
  );
});

describe('#minLength', () => {
  test('returns value when longer string', () => {
    expect(schema.string({ minLength: 2 }).validate('foo')).toBe('foo');
  });

  test('returns error when shorter string', () => {
    expect(() =>
      schema.string({ minLength: 4 }).validate('foo')
    ).toThrowErrorMatchingInlineSnapshot(
      `"value has length [3] but it must have a minimum length of [4]."`
    );
  });

  test('returns error when empty string', () => {
    expect(() => schema.string({ minLength: 2 }).validate('')).toThrowErrorMatchingInlineSnapshot(
      `"value has length [0] but it must have a minimum length of [2]."`
    );
  });
});

describe('#maxLength', () => {
  test('returns value when shorter string', () => {
    expect(schema.string({ maxLength: 4 }).validate('foo')).toBe('foo');
  });

  test('returns error when longer string', () => {
    expect(() =>
      schema.string({ maxLength: 2 }).validate('foo')
    ).toThrowErrorMatchingInlineSnapshot(
      `"value has length [3] but it must have a maximum length of [2]."`
    );
  });
});

describe('#defaultValue', () => {
  test('returns default when string is undefined', () => {
    expect(schema.string({ defaultValue: 'foo' }).validate(undefined)).toBe('foo');
  });

  test('returns value when specified', () => {
    expect(schema.string({ defaultValue: 'foo' }).validate('bar')).toBe('bar');
  });
});

describe('#validate', () => {
  test('is called with input value', () => {
    let calledWith;

    const validator = (val: any) => {
      calledWith = val;
    };

    schema.string({ validate: validator }).validate('test');

    expect(calledWith).toBe('test');
  });

  test('is not called with default value in no input', () => {
    const validate = jest.fn();

    schema.string({ validate, defaultValue: 'foo' }).validate(undefined);

    expect(validate).not.toHaveBeenCalled();
  });

  test('throws when returns string', () => {
    const validate = () => 'validator failure';

    expect(() => schema.string({ validate }).validate('foo')).toThrowErrorMatchingInlineSnapshot(
      `"validator failure"`
    );
  });

  test('throw when empty string', () => {
    const validate = () => 'validator failure';

    expect(() => schema.string({ validate }).validate('')).toThrowErrorMatchingInlineSnapshot(
      `"validator failure"`
    );
  });
});
