/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { exactCheck } from '@kbn/securitysolution-io-ts-utils';
import { pitOrUndefined } from '.';

import * as t from 'io-ts';
import { pipe } from 'fp-ts/lib/pipeable';
import { left } from 'fp-ts/lib/Either';

import { foldLeftRight, getPaths } from '@kbn/securitysolution-io-ts-utils';

describe('pitOrUndefined', () => {
  test('it will validate a correct pit', () => {
    const payload = { id: '123', keepAlive: '1m' };
    const decoded = pitOrUndefined.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it will validate with the value of "undefined"', () => {
    const obj = t.exact(
      t.type({
        pit_id: pitOrUndefined,
      })
    );
    const payload: t.TypeOf<typeof obj> = {
      pit_id: undefined,
    };
    const decoded = obj.decode({
      pit_id: undefined,
    });
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it will validate a correct pit without having a "keepAlive"', () => {
    const payload = { id: '123' };
    const decoded = pitOrUndefined.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it will fail to validate an incorrect pit', () => {
    const payload = 'foo';
    const decoded = pitOrUndefined.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "foo" supplied to "({| id: string, keepAlive: (string | undefined) |} | undefined)"',
    ]);
    expect(message.schema).toEqual({});
  });
});
