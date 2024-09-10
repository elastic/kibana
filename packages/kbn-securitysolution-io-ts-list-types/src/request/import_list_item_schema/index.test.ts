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

import { ImportListItemSchema, importListItemSchema } from '.';
import { getImportListItemSchemaMock } from './index.mock';

describe('import_list_item_schema', () => {
  test('it should validate a typical lists request', () => {
    const payload = getImportListItemSchemaMock();
    const decoded = importListItemSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should NOT accept an undefined for a file', () => {
    const payload = getImportListItemSchemaMock();
    // @ts-expect-error
    delete payload.file;
    const decoded = importListItemSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "undefined" supplied to "file"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should not allow an extra key to be sent in', () => {
    const payload: ImportListItemSchema & {
      extraKey?: string;
    } = getImportListItemSchemaMock();
    payload.extraKey = 'some new value';
    const decoded = importListItemSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual(['invalid keys "extraKey"']);
    expect(message.schema).toEqual({});
  });
});
