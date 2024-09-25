/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isReferenceObject, validatePathParameters } from './common';

test.each([
  [null, false],
  [0, false],
  [1, false],
  [NaN, false],
  [undefined, false],
  [true, false],
  ['', false],
  ['123', false],
  [[], false],
  [{}, false],
  [{ $ref: '#/components/schema/test' }, true],
])('isReferenceObject %p', (value, result) => {
  expect(isReferenceObject(value)).toBe(result);
});

describe('validatePathParameters', () => {
  test.each([
    [['a'], []],
    [[], ['a']],
    [['a', 'b'], ['a']],
    [['a'], ['a', 'b']],
  ])(
    'throws if path parameters do not match what the schema expects: %p %p',
    (pathParams, schemaParams) => {
      expect(() => validatePathParameters(pathParams, schemaParams)).toThrow(
        /^Schema expects.*but path contains/
      );
    }
  );

  test.each([
    [['a'], ['b']],
    [
      ['a', 'b*'],
      ['a', 'c'],
    ],
  ])('throws if schema does not know about a path parameter: %p %p', (pathParam, schemaParam) => {
    expect(() => validatePathParameters(pathParam, schemaParam)).toThrow(
      /^Path expects key.*from schema but it was not found/
    );
  });

  test(`handles '*' in param names`, () => {
    expect(() => validatePathParameters(['*a*'], ['*a'])).not.toThrow(
      /^Path expects key.*from schema but it was not found/
    );
  });
});
