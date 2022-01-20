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

import { importExceptionsResponseSchema, ImportExceptionsResponseSchema } from '.';
import { getImportExceptionsResponseSchemaMock } from './index.mock';

describe('importExceptionsResponseSchema', () => {
  test('it should validate a typical exceptions import response', () => {
    const payload = getImportExceptionsResponseSchemaMock();
    const decoded = importExceptionsResponseSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should NOT accept an undefined for "errors"', () => {
    const payload: Partial<ReturnType<typeof getImportExceptionsResponseSchemaMock>> =
      getImportExceptionsResponseSchemaMock();
    delete payload.errors;
    const decoded = importExceptionsResponseSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "undefined" supplied to "errors"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should NOT accept an undefined for "success"', () => {
    const payload: Partial<ReturnType<typeof getImportExceptionsResponseSchemaMock>> =
      getImportExceptionsResponseSchemaMock();
    delete payload.success;
    const decoded = importExceptionsResponseSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "undefined" supplied to "success"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should NOT accept an undefined for "success_count"', () => {
    const payload: Partial<ReturnType<typeof getImportExceptionsResponseSchemaMock>> =
      getImportExceptionsResponseSchemaMock();
    delete payload.success_count;
    const decoded = importExceptionsResponseSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "undefined" supplied to "success_count"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should NOT accept an undefined for "success_exception_lists"', () => {
    const payload: Partial<ReturnType<typeof getImportExceptionsResponseSchemaMock>> =
      getImportExceptionsResponseSchemaMock();
    delete payload.success_exception_lists;
    const decoded = importExceptionsResponseSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "undefined" supplied to "success_exception_lists"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should NOT accept an undefined for "success_count_exception_lists"', () => {
    const payload: Partial<ReturnType<typeof getImportExceptionsResponseSchemaMock>> =
      getImportExceptionsResponseSchemaMock();
    delete payload.success_count_exception_lists;
    const decoded = importExceptionsResponseSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "undefined" supplied to "success_count_exception_lists"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should NOT accept an undefined for "success_exception_list_items"', () => {
    const payload: Partial<ReturnType<typeof getImportExceptionsResponseSchemaMock>> =
      getImportExceptionsResponseSchemaMock();
    delete payload.success_exception_list_items;
    const decoded = importExceptionsResponseSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "undefined" supplied to "success_exception_list_items"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should NOT accept an undefined for "success_count_exception_list_items"', () => {
    const payload: Partial<ReturnType<typeof getImportExceptionsResponseSchemaMock>> =
      getImportExceptionsResponseSchemaMock();
    delete payload.success_count_exception_list_items;
    const decoded = importExceptionsResponseSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "undefined" supplied to "success_count_exception_list_items"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should not allow an extra key to be sent in', () => {
    const payload: ImportExceptionsResponseSchema & {
      extraKey?: string;
    } = getImportExceptionsResponseSchemaMock();
    payload.extraKey = 'some new value';
    const decoded = importExceptionsResponseSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual(['invalid keys "extraKey"']);
    expect(message.schema).toEqual({});
  });
});
