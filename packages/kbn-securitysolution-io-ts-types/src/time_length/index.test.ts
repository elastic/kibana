/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { pipe } from 'fp-ts/lib/pipeable';
import { left } from 'fp-ts/lib/Either';
import { TimeLength } from '.';
import { foldLeftRight, getPaths } from '@kbn/securitysolution-io-ts-utils';

describe('time_unit', () => {
  test('it should validate a correctly formed TimeLength with time unit of seconds', () => {
    const payload = '1s';
    const decoded = TimeLength.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should validate a correctly formed TimeLength with time unit of minutes', () => {
    const payload = '100m';
    const decoded = TimeLength.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should validate a correctly formed TimeLength with time unit of hours', () => {
    const payload = '10000000h';
    const decoded = TimeLength.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should NOT validate a TimeLength with some other time unit', () => {
    const payload = '10000000w';
    const decoded = TimeLength.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "10000000w" supplied to "TimeLength"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should NOT validate a TimeLength with a time interval with incorrect format', () => {
    const payload = '100ff0000w';
    const decoded = TimeLength.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "100ff0000w" supplied to "TimeLength"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should NOT validate an empty string', () => {
    const payload = '';
    const decoded = TimeLength.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual(['Invalid value "" supplied to "TimeLength"']);
    expect(message.schema).toEqual({});
  });

  test('it should NOT validate an number', () => {
    const payload = 100;
    const decoded = TimeLength.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "100" supplied to "TimeLength"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should NOT validate an TimeLength with a valid time unit but unsafe integer', () => {
    const payload = `${Math.pow(2, 53)}h`;
    const decoded = TimeLength.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      `Invalid value "${Math.pow(2, 53)}h" supplied to "TimeLength"`,
    ]);
    expect(message.schema).toEqual({});
  });
});
