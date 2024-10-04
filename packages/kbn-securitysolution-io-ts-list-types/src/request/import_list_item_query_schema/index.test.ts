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

import { ImportListItemQuerySchema, importListItemQuerySchema } from '.';
import { getImportListItemQuerySchemaMock } from './index.mock';

describe('import_list_item_schema', () => {
  test('it should validate a typical lists request', () => {
    const payload = getImportListItemQuerySchemaMock();
    const decoded = importListItemQuerySchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should accept an undefined for "list_id"', () => {
    const payload = getImportListItemQuerySchemaMock();
    delete payload.list_id;
    const decoded = importListItemQuerySchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should accept an undefined for "type"', () => {
    const payload = getImportListItemQuerySchemaMock();
    delete payload.type;
    const decoded = importListItemQuerySchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should accept an undefined for "type" and "list_id', () => {
    const payload = getImportListItemQuerySchemaMock();
    delete payload.type;
    delete payload.list_id;
    const decoded = importListItemQuerySchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should accept an undefined for "serializer"', () => {
    const payload = getImportListItemQuerySchemaMock();
    delete payload.serializer;
    const decoded = importListItemQuerySchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should accept an undefined for "deserializer"', () => {
    const payload = getImportListItemQuerySchemaMock();
    delete payload.deserializer;
    const decoded = importListItemQuerySchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should not allow an extra key to be sent in', () => {
    const payload: ImportListItemQuerySchema & {
      extraKey?: string;
    } = getImportListItemQuerySchemaMock();
    payload.extraKey = 'some new value';
    const decoded = importListItemQuerySchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual(['invalid keys "extraKey"']);
    expect(message.schema).toEqual({});
  });
});
