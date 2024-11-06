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
import { NumberBetweenZeroAndOneInclusive } from '.';
import { foldLeftRight, getPaths } from '@kbn/securitysolution-io-ts-utils';

describe('NumberBetweenZeroAndOneInclusive', () => {
  test('it should validate 1', () => {
    const payload = 1;
    const decoded = NumberBetweenZeroAndOneInclusive.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should validate a zero', () => {
    const payload = 0;
    const decoded = NumberBetweenZeroAndOneInclusive.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should validate a float between 0 and 1', () => {
    const payload = 0.58;
    const decoded = NumberBetweenZeroAndOneInclusive.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should NOT validate a negative number', () => {
    const payload = -1;
    const decoded = NumberBetweenZeroAndOneInclusive.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "-1" supplied to "NumberBetweenZeroAndOneInclusive"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should NOT validate NaN', () => {
    const payload = NaN;
    const decoded = NumberBetweenZeroAndOneInclusive.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "NaN" supplied to "NumberBetweenZeroAndOneInclusive"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should NOT validate Infinity', () => {
    const payload = Infinity;
    const decoded = NumberBetweenZeroAndOneInclusive.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "Infinity" supplied to "NumberBetweenZeroAndOneInclusive"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should NOT validate a string', () => {
    const payload = 'some string';
    const decoded = NumberBetweenZeroAndOneInclusive.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "some string" supplied to "NumberBetweenZeroAndOneInclusive"',
    ]);
    expect(message.schema).toEqual({});
  });
});
