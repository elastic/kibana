/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { pipe } from 'fp-ts/lib/pipeable';
import { left } from 'fp-ts/lib/Either';
import { Throttle } from '../throttle';
import { DefaultThrottleNull } from '.';
import { foldLeftRight, getPaths } from '@kbn/securitysolution-io-ts-utils';

describe('default_throttle_null', () => {
  test('it should validate a throttle string', () => {
    const payload: Throttle = 'some string';
    const decoded = DefaultThrottleNull.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should not validate an array with a number', () => {
    const payload = 5;
    const decoded = DefaultThrottleNull.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "5" supplied to "DefaultThreatNull"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should return a default "null" if not provided a value', () => {
    const payload = undefined;
    const decoded = DefaultThrottleNull.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(null);
  });
});
