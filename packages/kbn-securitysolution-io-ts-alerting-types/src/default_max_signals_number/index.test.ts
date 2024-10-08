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
import { DefaultMaxSignalsNumber } from '.';
import { foldLeftRight, getPaths } from '@kbn/securitysolution-io-ts-utils';
import { DEFAULT_MAX_SIGNALS } from '../constants';

describe('default_from_string', () => {
  test('it should validate a max signal number', () => {
    const payload = 5;
    const decoded = DefaultMaxSignalsNumber.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should not validate a string', () => {
    const payload = '5';
    const decoded = DefaultMaxSignalsNumber.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "5" supplied to "DefaultMaxSignals"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should not validate a zero', () => {
    const payload = 0;
    const decoded = DefaultMaxSignalsNumber.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "0" supplied to "DefaultMaxSignals"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should not validate a negative number', () => {
    const payload = -1;
    const decoded = DefaultMaxSignalsNumber.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "-1" supplied to "DefaultMaxSignals"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should return a default of DEFAULT_MAX_SIGNALS', () => {
    const payload = null;
    const decoded = DefaultMaxSignalsNumber.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(DEFAULT_MAX_SIGNALS);
  });
});
