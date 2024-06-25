/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema } from '../..';
import { META_FIELD_X_OAS_MAX_LENGTH, META_FIELD_X_OAS_MIN_LENGTH } from '../oas_meta_fields';

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

test('reject numeric values if `coerceFromNumber` is unspecified', () => {
  expect(() => schema.string({}).validate(1234)).toThrowErrorMatchingInlineSnapshot(
    `"expected value of type [string] but got [number]"`
  );
});

test('coerce numeric values if `coerceFromNumber` is `true`', () => {
  expect(schema.string({ coerceFromNumber: true }).validate(1234)).toBe('1234');
});

test('includes namespace in failure', () => {
  expect(() =>
    schema.string().validate(undefined, {}, 'foo-namespace')
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

describe('#hostname', () => {
  test('returns value for valid hostname as per RFC1123', () => {
    const hostNameSchema = schema.string({ hostname: true });

    expect(hostNameSchema.validate('www.example.com')).toBe('www.example.com');
    expect(hostNameSchema.validate('3domain.local')).toBe('3domain.local');
    expect(hostNameSchema.validate('hostname')).toBe('hostname');
    expect(hostNameSchema.validate('::1')).toBe('::1');
    expect(hostNameSchema.validate('0:0:0:0:0:0:0:1')).toBe('0:0:0:0:0:0:0:1');
    expect(hostNameSchema.validate('xn----ascii-7gg5ei7b1i.xn--90a3a')).toBe(
      'xn----ascii-7gg5ei7b1i.xn--90a3a'
    );

    const hostNameWithMaxAllowedLength = Array(4).fill('a'.repeat(63)).join('.');
    expect(hostNameSchema.validate(hostNameWithMaxAllowedLength)).toBe(
      hostNameWithMaxAllowedLength
    );
  });

  test('returns error when value is not a valid hostname', () => {
    const hostNameSchema = schema.string({ hostname: true });

    expect(() => hostNameSchema.validate('2387628')).toThrowErrorMatchingInlineSnapshot(
      `"value must be a valid hostname (see RFC 1123)."`
    );
    expect(() =>
      hostNameSchema.validate(Array(4).fill('a'.repeat(64)).join('.'))
    ).toThrowErrorMatchingInlineSnapshot(`"value must be a valid hostname (see RFC 1123)."`);
    expect(() => hostNameSchema.validate('host:name')).toThrowErrorMatchingInlineSnapshot(
      `"value must be a valid hostname (see RFC 1123)."`
    );
    expect(() => hostNameSchema.validate('localhost:5601')).toThrowErrorMatchingInlineSnapshot(
      `"value must be a valid hostname (see RFC 1123)."`
    );
    expect(() => hostNameSchema.validate('-')).toThrowErrorMatchingInlineSnapshot(
      `"value must be a valid hostname (see RFC 1123)."`
    );
    expect(() => hostNameSchema.validate('0:?:0:0:0:0:0:1')).toThrowErrorMatchingInlineSnapshot(
      `"value must be a valid hostname (see RFC 1123)."`
    );
    expect(() => hostNameSchema.validate('a'.repeat(256))).toThrowErrorMatchingInlineSnapshot(
      `"value must be a valid hostname (see RFC 1123)."`
    );
  });

  test('returns error when empty string', () => {
    expect(() => schema.string({ hostname: true }).validate('')).toThrowErrorMatchingInlineSnapshot(
      `"\\"value\\" is not allowed to be empty"`
    );
  });

  test('supports string validation rules', () => {
    expect(() =>
      schema.string({ hostname: true, maxLength: 3 }).validate('www.example.com')
    ).toThrowErrorMatchingInlineSnapshot(
      `"value has length [15] but it must have a maximum length of [3]."`
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

  test('returns value from context when context reference is specified', () => {
    expect(
      schema.string({ defaultValue: schema.contextRef('some_value') }).validate(undefined, {
        some_value: 'some',
      })
    ).toBe('some');
  });
});

test('meta', () => {
  const string = schema.string({ minLength: 1, maxLength: 3 });
  const [meta1, meta2] = string.getSchema().describe().metas ?? [];
  expect(meta1).toEqual({
    [META_FIELD_X_OAS_MIN_LENGTH]: 1,
  });
  expect(meta2).toEqual({
    [META_FIELD_X_OAS_MAX_LENGTH]: 3,
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
