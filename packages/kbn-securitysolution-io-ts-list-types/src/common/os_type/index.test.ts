/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { exactCheck } from '@kbn/securitysolution-io-ts-utils';
import { osType, osTypeArrayOrUndefined } from '.';

import { pipe } from 'fp-ts/lib/pipeable';
import { left } from 'fp-ts/lib/Either';

import { foldLeftRight, getPaths } from '@kbn/securitysolution-io-ts-utils';

describe('osType', () => {
  test('it will validate a correct osType', () => {
    const payload = 'windows';
    const decoded = osType.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it will fail to validate an incorrect osType', () => {
    const payload = 'foo';
    const decoded = osType.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "foo" supplied to ""linux" | "macos" | "windows""',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it will default to an empty array when osTypeArrayOrUndefined is used', () => {
    const payload = undefined;
    const decoded = osTypeArrayOrUndefined.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual([]);
  });
});
