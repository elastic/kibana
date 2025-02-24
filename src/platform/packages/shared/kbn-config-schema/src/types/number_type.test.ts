/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '../..';

test('returns value by default', () => {
  expect(schema.number().validate(4)).toBe(4);
});

test('handles numeric strings with ints', () => {
  expect(schema.number().validate('4')).toBe(4);
});

test('handles numeric strings with floats', () => {
  expect(schema.number().validate('4.23')).toBe(4.23);
});

test('fails if number is `NaN`', () => {
  expect(() => schema.number().validate(NaN)).toThrowErrorMatchingInlineSnapshot(
    `"expected value of type [number] but got [number]"`
  );
});

test('is required by default', () => {
  expect(() => schema.number().validate(undefined)).toThrowErrorMatchingInlineSnapshot(
    `"expected value of type [number] but got [undefined]"`
  );
});

test('includes namespace in failure', () => {
  expect(() =>
    schema.number().validate(undefined, {}, 'foo-namespace')
  ).toThrowErrorMatchingInlineSnapshot(
    `"[foo-namespace]: expected value of type [number] but got [undefined]"`
  );
});

describe('#min', () => {
  test('returns value when larger number', () => {
    expect(schema.number({ min: 2 }).validate(3)).toBe(3);
  });

  test('returns error when smaller number', () => {
    expect(() => schema.number({ min: 4 }).validate(3)).toThrowErrorMatchingInlineSnapshot(
      `"Value must be equal to or greater than [4]."`
    );
  });
});

describe('#max', () => {
  test('returns value when smaller number', () => {
    expect(schema.number({ max: 4 }).validate(3)).toBe(3);
  });

  test('returns error when larger number', () => {
    expect(() => schema.number({ max: 2 }).validate(3)).toThrowErrorMatchingInlineSnapshot(
      `"Value must be equal to or lower than [2]."`
    );
  });
});

describe('#unsafe', () => {
  it('rejects unsafe numbers when undefined', () => {
    expect(() => schema.number().validate(9007199254740992)).toThrowErrorMatchingInlineSnapshot(
      `"\\"value\\" must be a safe number"`
    );
  });

  it('rejects unsafe numbers when false', () => {
    expect(() =>
      schema.number({ unsafe: false }).validate(9007199254740992)
    ).toThrowErrorMatchingInlineSnapshot(`"\\"value\\" must be a safe number"`);
  });

  it('accepts unsafe numbers when true', () => {
    expect(schema.number({ unsafe: true }).validate(9007199254740992)).toBeGreaterThan(
      9007199254740991
    );
  });
});

describe('#defaultValue', () => {
  test('returns default when number is undefined', () => {
    expect(schema.number({ defaultValue: 2 }).validate(undefined)).toBe(2);
  });

  test('returns value when specified', () => {
    expect(schema.number({ defaultValue: 2 }).validate(3)).toBe(3);
  });
});

test('returns error when not number or numeric string', () => {
  expect(() => schema.number().validate('test')).toThrowErrorMatchingInlineSnapshot(
    `"expected value of type [number] but got [string]"`
  );

  expect(() => schema.number().validate([1, 2, 3])).toThrowErrorMatchingInlineSnapshot(
    `"expected value of type [number] but got [Array]"`
  );

  expect(() => schema.number().validate(/abc/)).toThrowErrorMatchingInlineSnapshot(
    `"expected value of type [number] but got [RegExp]"`
  );
});
