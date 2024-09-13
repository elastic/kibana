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

import { CreateExceptionListSchema, createExceptionListSchema } from '.';
import { getCreateExceptionListSchemaMock } from './index.mock';

describe('create_exception_list_schema', () => {
  test('it should validate a typical exception lists request and generate a correct body not counting the uuid', () => {
    const payload = getCreateExceptionListSchemaMock();
    const decoded = createExceptionListSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    delete (message.schema as CreateExceptionListSchema).list_id;
    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should accept an undefined for "meta" and generate a correct body not counting the uuid', () => {
    const payload = getCreateExceptionListSchemaMock();
    delete payload.meta;
    const decoded = createExceptionListSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    delete (message.schema as CreateExceptionListSchema).list_id;
    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should accept an undefined for "tags" but return an array and generate a correct body not counting the uuid', () => {
    const inputPayload = getCreateExceptionListSchemaMock();
    const outputPayload = getCreateExceptionListSchemaMock();
    delete inputPayload.tags;
    outputPayload.tags = [];
    const decoded = createExceptionListSchema.decode(inputPayload);
    const checked = exactCheck(inputPayload, decoded);
    const message = pipe(checked, foldLeftRight);
    delete (message.schema as CreateExceptionListSchema).list_id;
    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(outputPayload);
  });

  test('it should accept an undefined for "list_id" and auto generate a uuid', () => {
    const inputPayload = getCreateExceptionListSchemaMock();
    delete inputPayload.list_id;
    const decoded = createExceptionListSchema.decode(inputPayload);
    const checked = exactCheck(inputPayload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    expect((message.schema as CreateExceptionListSchema).list_id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );
  });

  test('it should accept an undefined for "list_id" and generate a correct body not counting the uuid', () => {
    const inputPayload = getCreateExceptionListSchemaMock();
    delete inputPayload.list_id;
    const decoded = createExceptionListSchema.decode(inputPayload);
    const checked = exactCheck(inputPayload, decoded);
    const message = pipe(checked, foldLeftRight);
    delete (message.schema as CreateExceptionListSchema).list_id;
    expect(message.schema).toEqual(inputPayload);
  });

  test('it should not allow an extra key to be sent in', () => {
    const payload: CreateExceptionListSchema & {
      extraKey?: string;
    } = getCreateExceptionListSchemaMock();
    payload.extraKey = 'some new value';
    const decoded = createExceptionListSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual(['invalid keys "extraKey"']);
    expect(message.schema).toEqual({});
  });
});
