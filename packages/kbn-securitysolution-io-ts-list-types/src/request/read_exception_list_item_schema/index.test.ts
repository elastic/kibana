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

import { getReadExceptionListItemSchemaMock } from './index.mock';
import { ReadExceptionListItemSchema, readExceptionListItemSchema } from '.';

describe('read_exception_list_item_schema', () => {
  test('it should validate a typical exception list request', () => {
    const payload = getReadExceptionListItemSchemaMock();
    const decoded = readExceptionListItemSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should accept an undefined for "id"', () => {
    const payload = getReadExceptionListItemSchemaMock();
    delete payload.id;
    const decoded = readExceptionListItemSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should accept an undefined for "item_id"', () => {
    const payload = getReadExceptionListItemSchemaMock();
    delete payload.item_id;
    const decoded = readExceptionListItemSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should accept an undefined for "namespace_type" but default to "single"', () => {
    const payload = getReadExceptionListItemSchemaMock();
    delete payload.namespace_type;
    const decoded = readExceptionListItemSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(getReadExceptionListItemSchemaMock());
  });

  test('it should accept an undefined for "id", "item_id", "namespace_type" but default "namespace_type" to "single"', () => {
    const payload = getReadExceptionListItemSchemaMock();
    delete payload.id;
    delete payload.namespace_type;
    delete payload.item_id;
    const output = getReadExceptionListItemSchemaMock();
    delete output.id;
    delete output.item_id;
    const decoded = readExceptionListItemSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(output);
  });

  test('it should accept an undefined for "id", "item_id"', () => {
    const payload = getReadExceptionListItemSchemaMock();
    delete payload.id;
    delete payload.item_id;
    const decoded = readExceptionListItemSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should accept an undefined for "id", "namespace_type" but default "namespace_type" to "single"', () => {
    const payload = getReadExceptionListItemSchemaMock();
    delete payload.id;
    delete payload.namespace_type;
    const output = getReadExceptionListItemSchemaMock();
    delete output.id;
    const decoded = readExceptionListItemSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(output);
  });

  test('it should accept an undefined for "item_id", "namespace_type" but default "namespace_type" to "single"', () => {
    const payload = getReadExceptionListItemSchemaMock();
    delete payload.namespace_type;
    delete payload.item_id;
    const output = getReadExceptionListItemSchemaMock();
    delete output.item_id;
    const decoded = readExceptionListItemSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(output);
  });

  test('it should not allow an extra key to be sent in', () => {
    const payload: ReadExceptionListItemSchema & {
      extraKey?: string;
    } = getReadExceptionListItemSchemaMock();
    payload.extraKey = 'some new value';
    const decoded = readExceptionListItemSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual(['invalid keys "extraKey"']);
    expect(message.schema).toEqual({});
  });
});
