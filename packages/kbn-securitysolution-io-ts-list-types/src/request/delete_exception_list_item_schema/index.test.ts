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

import { DeleteExceptionListItemSchema, deleteExceptionListItemSchema } from '.';
import { getDeleteExceptionListItemSchemaMock } from './index.mock';

describe('delete_exception_list_item_schema', () => {
  test('it should validate a typical exception list item request', () => {
    const payload = getDeleteExceptionListItemSchemaMock();
    const decoded = deleteExceptionListItemSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should accept an undefined for "namespace_type" but default to "single"', () => {
    const payload = getDeleteExceptionListItemSchemaMock();
    delete payload.namespace_type;
    const decoded = deleteExceptionListItemSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(getDeleteExceptionListItemSchemaMock());
  });

  test('it should not allow an extra key to be sent in', () => {
    const payload: DeleteExceptionListItemSchema & {
      extraKey?: string;
    } = getDeleteExceptionListItemSchemaMock();
    payload.extraKey = 'some new value';
    const decoded = deleteExceptionListItemSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual(['invalid keys "extraKey"']);
    expect(message.schema).toEqual({});
  });
});
