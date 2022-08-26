/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { left } from 'fp-ts/lib/Either';
import { pipe } from 'fp-ts/lib/pipeable';
import { exactCheck, foldLeftRight, getPaths } from '@kbn/securitysolution-io-ts-utils';

import {
  internalCreateExceptionListQuerySchema,
  InternalCreateExceptionListQuerySchema,
  InternalCreateExceptionListSchema,
} from '.';

describe('internal create_exception_list_schema', () => {
  test('it should accept ignore_existing query parammeter as boolean', () => {
    const query: InternalCreateExceptionListQuerySchema = { ignore_existing: true };
    const decoded = internalCreateExceptionListQuerySchema.decode(query);
    const checked = exactCheck(query, decoded);
    const message = pipe(checked, foldLeftRight);
    delete (message.schema as InternalCreateExceptionListSchema).list_id;
    expect(message.schema).toEqual(query);
  });

  test('it should accept undefined ignore_existing query parammeter and set it to false by default', () => {
    const query: InternalCreateExceptionListQuerySchema = {};
    const decoded = internalCreateExceptionListQuerySchema.decode(query);
    const checked = exactCheck(query, decoded);
    const message = pipe(checked, foldLeftRight);
    delete (message.schema as InternalCreateExceptionListSchema).list_id;
    expect(message.schema).toEqual({ ignore_existing: false });
  });

  test('it should not allow wrong ignore_existing type query parammeter', () => {
    const query: InternalCreateExceptionListQuerySchema = { ignore_existing: 'wrong' };
    const decoded = internalCreateExceptionListQuerySchema.decode(query);
    const checked = exactCheck(query, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "wrong" supplied to "ignore_existing"',
    ]);
    expect(message.schema).toEqual({});
  });
});
