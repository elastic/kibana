/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { exactCheck } from '@kbn/securitysolution-io-ts-utils';
import { search_after } from '.';

import { pipe } from 'fp-ts/lib/pipeable';
import { left } from 'fp-ts/lib/Either';

import { foldLeftRight, getPaths } from '@kbn/securitysolution-io-ts-utils';

describe('pitOrUndefined', () => {
  test('it will validate a correct search_after', () => {
    const payload = ['test-1', 'test-2'];
    const decoded = search_after.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it will fail to validate an incorrect search_after', () => {
    const payload = 'foo';
    const decoded = search_after.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "foo" supplied to "(Array<string> | undefined)"',
    ]);
    expect(message.schema).toEqual({});
  });
});
