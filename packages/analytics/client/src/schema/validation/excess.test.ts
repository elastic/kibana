/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as t from 'io-ts';
import { either, isLeft } from 'fp-ts/lib/Either';
import { excess } from './excess';

describe('excess', () => {
  test('should pass validation when not found extra properties', () => {
    const validator = excess(t.interface({ a_string: t.string, a_number: t.number }));
    const invalidObj = { a_string: 'test', a_number: 1 };
    expect(validator.is(invalidObj)).toBe(true);
    const result = validator.decode(invalidObj);
    expect(isLeft(result)).toBe(false);
  });

  test('should not pass validation when found extra properties', () => {
    const validator = excess(t.interface({ a_string: t.string, a_number: t.number }));
    const invalidObj = { a_string: 'test', a_number: 1, another_string: 'test' };
    expect(validator.is(invalidObj)).toBe(false);
    const result = validator.decode(invalidObj);
    expect(isLeft(result)).toBe(true);
    either.mapLeft(result, (validationError) =>
      expect(validationError[0].message).toBe(`excess key 'another_string' found`)
    );
  });

  test('should not pass validation when found a non-declared property in an all-optional object', () => {
    const validator = excess(t.partial({ a_string: t.string, a_number: t.number }));
    const invalidObj = { another_string: 'test' };
    expect(validator.is(invalidObj)).toBe(false);
    const result = validator.decode(invalidObj);
    expect(isLeft(result)).toBe(true);
    either.mapLeft(result, (validationErrors) =>
      expect(validationErrors.map((err) => err.message)).toStrictEqual([
        `excess key 'another_string' found`,
      ])
    );
  });
});
