/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { pipe } from 'fp-ts/lib/pipeable';
import { left } from 'fp-ts/lib/Either';
import { DefaultPage } from '.';
import { foldLeftRight, getPaths } from '@kbn/securitysolution-io-ts-utils';

describe('default_page', () => {
  test('it should validate a regular number greater than zero', () => {
    const payload = 5;
    const decoded = DefaultPage.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should validate a string of a number', () => {
    const payload = '5';
    const decoded = DefaultPage.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(5);
  });

  test('it should not validate a junk string', () => {
    const payload = 'invalid-string';
    const decoded = DefaultPage.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "NaN" supplied to "DefaultPerPage"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should not validate an empty string', () => {
    const payload = '';
    const decoded = DefaultPage.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "NaN" supplied to "DefaultPerPage"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should not validate a zero', () => {
    const payload = 0;
    const decoded = DefaultPage.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "0" supplied to "DefaultPerPage"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should not validate a negative number', () => {
    const payload = -1;
    const decoded = DefaultPage.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "-1" supplied to "DefaultPerPage"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should return a default of 20', () => {
    const payload = null;
    const decoded = DefaultPage.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(1);
  });
});
