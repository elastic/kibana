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

import { importExceptionListItemSchema, ImportExceptionListItemSchema } from '.';
import {
  getImportExceptionsListItemSchemaDecodedMock,
  getImportExceptionsListItemSchemaMock,
} from './index.mock';
import { getCommentsArrayMock } from '../../common/comment/index.mock';

describe('import_list_item_schema', () => {
  test('it should validate a typical item request', () => {
    const payload = getImportExceptionsListItemSchemaMock();
    const decoded = importExceptionListItemSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(getImportExceptionsListItemSchemaDecodedMock());
  });

  test('it should validate a typical item request with comments', () => {
    const payload = {
      ...getImportExceptionsListItemSchemaMock(),
      comments: getCommentsArrayMock(),
    };
    const decoded = importExceptionListItemSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual({
      ...getImportExceptionsListItemSchemaDecodedMock(),
      comments: [
        {
          comment: 'some old comment',
          created_at: '2020-04-20T15:25:31.830Z',
          created_by: 'some user',
          id: 'uuid_here',
        },
        {
          comment: 'some old comment',
          created_at: '2020-04-20T15:25:31.830Z',
          created_by: 'some user',
          id: 'uuid_here',
        },
      ],
    });
  });

  test('it should NOT accept an undefined for "item_id"', () => {
    const payload: Partial<ReturnType<typeof getImportExceptionsListItemSchemaMock>> =
      getImportExceptionsListItemSchemaMock();
    delete payload.item_id;
    const decoded = importExceptionListItemSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "undefined" supplied to "item_id"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should NOT accept an undefined for "list_id"', () => {
    const payload: Partial<ReturnType<typeof getImportExceptionsListItemSchemaMock>> =
      getImportExceptionsListItemSchemaMock();
    delete payload.list_id;
    const decoded = importExceptionListItemSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "undefined" supplied to "list_id"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should NOT accept an undefined for "description"', () => {
    const payload: Partial<ReturnType<typeof getImportExceptionsListItemSchemaMock>> =
      getImportExceptionsListItemSchemaMock();
    delete payload.description;
    const decoded = importExceptionListItemSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "undefined" supplied to "description"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should NOT accept an undefined for "name"', () => {
    const payload: Partial<ReturnType<typeof getImportExceptionsListItemSchemaMock>> =
      getImportExceptionsListItemSchemaMock();
    delete payload.name;
    const decoded = importExceptionListItemSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "undefined" supplied to "name"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should NOT accept an undefined for "type"', () => {
    const payload: Partial<ReturnType<typeof getImportExceptionsListItemSchemaMock>> =
      getImportExceptionsListItemSchemaMock();
    delete payload.type;
    const decoded = importExceptionListItemSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "undefined" supplied to "type"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should NOT accept an undefined for "entries"', () => {
    const payload: Partial<ReturnType<typeof getImportExceptionsListItemSchemaMock>> =
      getImportExceptionsListItemSchemaMock();
    delete payload.entries;
    const decoded = importExceptionListItemSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "undefined" supplied to "entries"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should accept any partial fields', () => {
    const payload: ImportExceptionListItemSchema = {
      ...getImportExceptionsListItemSchemaMock(),
      id: '123',
      namespace_type: 'single',
      comments: [],
      os_types: [],
      tags: ['123'],
      created_at: '2018-08-24T17:49:30.145142000',
      created_by: 'elastic',
      updated_at: '2018-08-24T17:49:30.145142000',
      updated_by: 'elastic',
      tie_breaker_id: '123',
      _version: '3',
      meta: undefined,
    };

    const decoded = importExceptionListItemSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should not allow an extra key to be sent in', () => {
    const payload: ImportExceptionListItemSchema & {
      extraKey?: string;
    } = getImportExceptionsListItemSchemaMock();
    payload.extraKey = 'some new value';
    const decoded = importExceptionListItemSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual(['invalid keys "extraKey"']);
    expect(message.schema).toEqual({});
  });
});
