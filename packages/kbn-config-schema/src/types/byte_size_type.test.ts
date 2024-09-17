/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '../..';
import { ByteSizeValue } from '../byte_size_value';

const { byteSize } = schema;

test('returns value by default', () => {
  expect(byteSize().validate('123b')).toEqual(new ByteSizeValue(123));
});

test('handles numeric strings', () => {
  expect(byteSize().validate('123')).toEqual(new ByteSizeValue(123));
});

test('handles numbers', () => {
  expect(byteSize().validate(123)).toEqual(new ByteSizeValue(123));
});

test('is required by default', () => {
  expect(() => byteSize().validate(undefined)).toThrowErrorMatchingInlineSnapshot(
    `"expected value of type [ByteSize] but got [undefined]"`
  );
});

test('includes namespace in failure', () => {
  expect(() =>
    byteSize().validate(undefined, {}, 'foo-namespace')
  ).toThrowErrorMatchingInlineSnapshot(
    `"[foo-namespace]: expected value of type [ByteSize] but got [undefined]"`
  );
});

describe('#defaultValue', () => {
  test('can be a ByteSizeValue', () => {
    expect(
      byteSize({
        defaultValue: ByteSizeValue.parse('1kb'),
      }).validate(undefined)
    ).toMatchInlineSnapshot(`
      ByteSizeValue {
        "valueInBytes": 1024,
      }
    `);
  });

  test('can be a string', () => {
    expect(
      byteSize({
        defaultValue: '1kb',
      }).validate(undefined)
    ).toMatchInlineSnapshot(`
      ByteSizeValue {
        "valueInBytes": 1024,
      }
    `);
  });

  test('can be a string-formatted number', () => {
    expect(
      byteSize({
        defaultValue: '1024',
      }).validate(undefined)
    ).toMatchInlineSnapshot(`
      ByteSizeValue {
        "valueInBytes": 1024,
      }
    `);
  });

  test('can be a number', () => {
    expect(
      byteSize({
        defaultValue: 1024,
      }).validate(undefined)
    ).toMatchInlineSnapshot(`
      ByteSizeValue {
        "valueInBytes": 1024,
      }
    `);
  });
});

describe('#min', () => {
  test('returns value when larger', () => {
    expect(
      byteSize({
        min: '1b',
      }).validate('1kb')
    ).toMatchInlineSnapshot(`
      ByteSizeValue {
        "valueInBytes": 1024,
      }
    `);
  });

  test('returns error when smaller', () => {
    expect(() =>
      byteSize({
        min: '1kb',
      }).validate('1b')
    ).toThrowErrorMatchingInlineSnapshot(`"Value must be equal to or greater than [1kb]"`);
  });
});

describe('#max', () => {
  test('returns value when smaller', () => {
    expect(byteSize({ max: '1kb' }).validate('1b')).toMatchInlineSnapshot(`
      ByteSizeValue {
        "valueInBytes": 1,
      }
    `);
  });

  test('returns error when larger', () => {
    expect(() => byteSize({ max: '1kb' }).validate('1mb')).toThrowErrorMatchingInlineSnapshot(
      `"Value must be equal to or less than [1kb]"`
    );
  });
});

test('returns error when not valid string or positive safe integer', () => {
  expect(() => byteSize().validate(-123)).toThrowErrorMatchingInlineSnapshot(
    `"Value in bytes is expected to be a safe positive integer."`
  );

  expect(() => byteSize().validate(NaN)).toThrowErrorMatchingInlineSnapshot(
    `"Value in bytes is expected to be a safe positive integer."`
  );

  expect(() => byteSize().validate(Infinity)).toThrowErrorMatchingInlineSnapshot(
    `"Value in bytes is expected to be a safe positive integer."`
  );

  expect(() => byteSize().validate(Math.pow(2, 53))).toThrowErrorMatchingInlineSnapshot(
    `"Value in bytes is expected to be a safe positive integer."`
  );

  expect(() => byteSize().validate([1, 2, 3])).toThrowErrorMatchingInlineSnapshot(
    `"expected value of type [ByteSize] but got [Array]"`
  );

  expect(() => byteSize().validate(/abc/)).toThrowErrorMatchingInlineSnapshot(
    `"expected value of type [ByteSize] but got [RegExp]"`
  );

  expect(() => byteSize().validate('123foo')).toThrowErrorMatchingInlineSnapshot(
    `"Failed to parse value as byte value. Value must be either number of bytes, or follow the format <count>[b|kb|mb|gb] (e.g., '1024kb', '200mb', '1gb'), where the number is a safe positive integer."`
  );

  expect(() => byteSize().validate('123 456')).toThrowErrorMatchingInlineSnapshot(
    `"Failed to parse value as byte value. Value must be either number of bytes, or follow the format <count>[b|kb|mb|gb] (e.g., '1024kb', '200mb', '1gb'), where the number is a safe positive integer."`
  );
});
