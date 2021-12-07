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

import { importExceptionsListSchema, ImportExceptionsListSchema } from '.';
import {
  getImportExceptionsListSchemaMock,
  getImportExceptionsListSchemaDecodedMock,
} from './index.mock';

describe('import_list_item_schema', () => {
  test('it should validate a typical lists request', () => {
    const payload = getImportExceptionsListSchemaMock();
    const decoded = importExceptionsListSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(getImportExceptionsListSchemaDecodedMock());
  });

  test('it should NOT accept an undefined for "list_id"', () => {
    const payload: Partial<ReturnType<typeof getImportExceptionsListSchemaMock>> =
      getImportExceptionsListSchemaMock();
    delete payload.list_id;
    const decoded = importExceptionsListSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "undefined" supplied to "list_id"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should NOT accept an undefined for "description"', () => {
    const payload: Partial<ReturnType<typeof getImportExceptionsListSchemaMock>> =
      getImportExceptionsListSchemaMock();
    delete payload.description;
    const decoded = importExceptionsListSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "undefined" supplied to "description"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should NOT accept an undefined for "name"', () => {
    const payload: Partial<ReturnType<typeof getImportExceptionsListSchemaMock>> =
      getImportExceptionsListSchemaMock();
    delete payload.name;
    const decoded = importExceptionsListSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "undefined" supplied to "name"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should NOT accept an undefined for "type"', () => {
    const payload: Partial<ReturnType<typeof getImportExceptionsListSchemaMock>> =
      getImportExceptionsListSchemaMock();
    delete payload.type;
    const decoded = importExceptionsListSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "undefined" supplied to "type"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should NOT accept value of "true" for "immutable"', () => {
    const payload: ImportExceptionsListSchema = {
      ...getImportExceptionsListSchemaMock(),
      immutable: true,
    };

    const decoded = importExceptionsListSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "true" supplied to "immutable"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should accept any partial fields', () => {
    const payload: ImportExceptionsListSchema = {
      ...getImportExceptionsListSchemaMock(),
      namespace_type: 'single',
      immutable: false,
      os_types: [],
      tags: ['123'],
      created_at: '2018-08-24T17:49:30.145142000',
      created_by: 'elastic',
      updated_at: '2018-08-24T17:49:30.145142000',
      updated_by: 'elastic',
      version: 3,
      tie_breaker_id: '123',
      _version: '3',
      meta: undefined,
    };

    const decoded = importExceptionsListSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should not allow an extra key to be sent in', () => {
    const payload: ImportExceptionsListSchema & {
      extraKey?: string;
    } = getImportExceptionsListSchemaMock();
    payload.extraKey = 'some new value';
    const decoded = importExceptionsListSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual(['invalid keys "extraKey"']);
    expect(message.schema).toEqual({});
  });
});
