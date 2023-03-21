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

import { LIST_ID } from '../../constants/index.mock';

import {
  getFindExceptionListItemSchemaDecodedMock,
  getFindExceptionListItemSchemaDecodedMultipleMock,
  getFindExceptionListItemSchemaMock,
  getFindExceptionListItemSchemaMultipleMock,
} from './index.mock';
import {
  FindExceptionListItemSchema,
  FindExceptionListItemSchemaDecoded,
  findExceptionListItemSchema,
} from '.';

describe('find_list_item_schema', () => {
  test('it should validate a typical find item request', () => {
    const payload = getFindExceptionListItemSchemaMock();
    const decoded = findExceptionListItemSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(getFindExceptionListItemSchemaDecodedMock());
  });

  test('it should validate a typical find item request with multiple input strings turned into array elements', () => {
    const payload = getFindExceptionListItemSchemaMultipleMock();
    const decoded = findExceptionListItemSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(getFindExceptionListItemSchemaDecodedMultipleMock());
  });

  test('it should validate just a list_id where it decodes into an array for list_id and adds a namespace_type of "single" as an array', () => {
    const payload: FindExceptionListItemSchema = { list_id: LIST_ID };
    const decoded = findExceptionListItemSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    const expected: FindExceptionListItemSchemaDecoded = {
      filter: [],
      list_id: [LIST_ID],
      namespace_type: ['single'],
      page: undefined,
      per_page: undefined,
      search: undefined,
      sort_field: undefined,
      sort_order: undefined,
    };
    expect(message.schema).toEqual(expected);
  });

  test('it should validate with page missing', () => {
    const payload = getFindExceptionListItemSchemaMock();
    delete payload.page;
    const decoded = findExceptionListItemSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    const expected = getFindExceptionListItemSchemaDecodedMock();
    delete expected.page;
    expect(message.schema).toEqual(expected);
  });

  test('it should validate with per_page missing', () => {
    const payload = getFindExceptionListItemSchemaMock();
    delete payload.per_page;
    const decoded = findExceptionListItemSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    const expected = getFindExceptionListItemSchemaDecodedMock();
    delete expected.per_page;
    expect(message.schema).toEqual(expected);
  });

  test('it should validate with filter missing and add filter as an empty array', () => {
    const payload = getFindExceptionListItemSchemaMock();
    delete payload.filter;
    const decoded = findExceptionListItemSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    const expected: FindExceptionListItemSchemaDecoded = {
      ...getFindExceptionListItemSchemaDecodedMock(),
      filter: [],
    };
    expect(message.schema).toEqual(expected);
  });

  test('it should validate with sort_field missing', () => {
    const payload = getFindExceptionListItemSchemaMock();
    delete payload.sort_field;
    const decoded = findExceptionListItemSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    const expected = getFindExceptionListItemSchemaDecodedMock();
    delete expected.sort_field;
    expect(message.schema).toEqual(expected);
  });

  test('it should validate with sort_order missing', () => {
    const payload = getFindExceptionListItemSchemaMock();
    delete payload.sort_order;
    const decoded = findExceptionListItemSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    const expected = getFindExceptionListItemSchemaDecodedMock();
    delete expected.sort_order;
    expect(message.schema).toEqual(expected);
  });

  test('it should validate with search missing', () => {
    const payload = getFindExceptionListItemSchemaMock();
    delete payload.search;
    const decoded = findExceptionListItemSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    const expected = getFindExceptionListItemSchemaDecodedMock();
    delete expected.search;
    expect(message.schema).toEqual(expected);
  });

  test('it should not allow an extra key to be sent in', () => {
    const payload: FindExceptionListItemSchema & {
      extraKey: string;
    } = { ...getFindExceptionListItemSchemaMock(), extraKey: 'some new value' };
    const decoded = findExceptionListItemSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual(['invalid keys "extraKey"']);
    expect(message.schema).toEqual({});
  });
});
