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
import { foldLeftRight, getPaths } from '@kbn/securitysolution-io-ts-utils';
import { NonEmptyString } from '.';

describe('non_empty_string', () => {
  test('it should validate a regular string', () => {
    const payload = '1';
    const decoded = NonEmptyString.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should not validate a number', () => {
    const payload = 5;
    const decoded = NonEmptyString.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "5" supplied to "NonEmptyString"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should not validate an empty string', () => {
    const payload = '';
    const decoded = NonEmptyString.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "" supplied to "NonEmptyString"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should not validate empty spaces', () => {
    const payload = '  ';
    const decoded = NonEmptyString.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "  " supplied to "NonEmptyString"',
    ]);
    expect(message.schema).toEqual({});
  });
});
