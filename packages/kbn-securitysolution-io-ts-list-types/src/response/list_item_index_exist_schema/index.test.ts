/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { left } from 'fp-ts/lib/Either';
import { pipe } from 'fp-ts/lib/pipeable';
import { exactCheck, foldLeftRight, getPaths } from '@kbn/securitysolution-io-ts-utils';

import { getListItemIndexExistSchemaResponseMock } from './index.mock';
import { ListItemIndexExistSchema, listItemIndexExistSchema } from '.';

describe('list_item_index_exist_schema', () => {
  test('it should validate a typical list item request', () => {
    const payload = getListItemIndexExistSchemaResponseMock();
    const decoded = listItemIndexExistSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should NOT accept an undefined for "list_index"', () => {
    const payload = getListItemIndexExistSchemaResponseMock();
    // @ts-expect-error
    delete payload.list_index;
    const decoded = listItemIndexExistSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "undefined" supplied to "list_index"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should NOT accept an undefined for "list_item_index"', () => {
    const payload = getListItemIndexExistSchemaResponseMock();
    // @ts-expect-error
    delete payload.list_item_index;
    const decoded = listItemIndexExistSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "undefined" supplied to "list_item_index"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should not allow an extra key to be sent in', () => {
    const payload: ListItemIndexExistSchema & {
      extraKey?: string;
    } = getListItemIndexExistSchemaResponseMock();
    payload.extraKey = 'some new value';
    const decoded = listItemIndexExistSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual(['invalid keys "extraKey"']);
    expect(message.schema).toEqual({});
  });
});
