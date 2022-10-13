/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { exactCheck } from '@kbn/securitysolution-io-ts-utils';
import { searchAfterOrUndefined } from '.';

import * as t from 'io-ts';
import { pipe } from 'fp-ts/lib/pipeable';
import { left } from 'fp-ts/lib/Either';

import { foldLeftRight, getPaths } from '@kbn/securitysolution-io-ts-utils';

describe('searchAfter', () => {
  test('it will validate a correct search_after', () => {
    const payload = ['test-1', 'test-2'];
    const decoded = searchAfterOrUndefined.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it will validate with the value of "undefined"', () => {
    const obj = t.exact(
      t.type({
        search_after: searchAfterOrUndefined,
      })
    );
    const payload: t.TypeOf<typeof obj> = {
      search_after: undefined,
    };
    const decoded = obj.decode({
      pit_id: undefined,
    });
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it will fail to validate an incorrect search_after', () => {
    const payload = 'foo';
    const decoded = searchAfterOrUndefined.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "foo" supplied to "(Array<string> | undefined)"',
    ]);
    expect(message.schema).toEqual({});
  });
});
