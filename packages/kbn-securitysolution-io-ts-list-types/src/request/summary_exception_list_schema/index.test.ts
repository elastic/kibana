/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { left } from 'fp-ts/lib/Either';
import { exactCheck, foldLeftRight, getPaths } from '@kbn/securitysolution-io-ts-utils';

import { getSummaryExceptionListSchemaMock } from './index.mock';
import { SummaryExceptionListSchema, summaryExceptionListSchema } from '.';

describe('summary_exception_list_schema', () => {
  test('it should validate a typical exception list request', () => {
    const payload = getSummaryExceptionListSchemaMock();
    const decoded = summaryExceptionListSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = foldLeftRight(checked);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should accept an undefined for "filter"', () => {
    const payload = getSummaryExceptionListSchemaMock();
    delete payload.filter;
    const decoded = summaryExceptionListSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = foldLeftRight(checked);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should accept an undefined for "id"', () => {
    const payload = getSummaryExceptionListSchemaMock();
    delete payload.id;
    const decoded = summaryExceptionListSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = foldLeftRight(checked);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should accept an undefined for "list_id"', () => {
    const payload = getSummaryExceptionListSchemaMock();
    delete payload.list_id;
    const decoded = summaryExceptionListSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = foldLeftRight(checked);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should accept an undefined for "namespace_type" but default to "single"', () => {
    const payload = getSummaryExceptionListSchemaMock();
    delete payload.namespace_type;
    const decoded = summaryExceptionListSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = foldLeftRight(checked);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(getSummaryExceptionListSchemaMock());
  });

  test('it should accept an undefined for "id", "list_id", "namespace_type" but default "namespace_type" to "single"', () => {
    const payload = getSummaryExceptionListSchemaMock();
    delete payload.id;
    delete payload.namespace_type;
    delete payload.list_id;
    const output = getSummaryExceptionListSchemaMock();
    delete output.id;
    delete output.list_id;
    const decoded = summaryExceptionListSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = foldLeftRight(checked);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(output);
  });

  test('it should accept an undefined for "id", "list_id"', () => {
    const payload = getSummaryExceptionListSchemaMock();
    delete payload.id;
    delete payload.list_id;
    const decoded = summaryExceptionListSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = foldLeftRight(checked);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should accept an undefined for "id", "namespace_type" but default "namespace_type" to "single"', () => {
    const payload = getSummaryExceptionListSchemaMock();
    delete payload.id;
    delete payload.namespace_type;
    const output = getSummaryExceptionListSchemaMock();
    delete output.id;
    const decoded = summaryExceptionListSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = foldLeftRight(checked);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(output);
  });

  test('it should accept an undefined for "list_id", "namespace_type" but default "namespace_type" to "single"', () => {
    const payload = getSummaryExceptionListSchemaMock();
    delete payload.namespace_type;
    delete payload.list_id;
    const output = getSummaryExceptionListSchemaMock();
    delete output.list_id;
    const decoded = summaryExceptionListSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = foldLeftRight(checked);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(output);
  });

  test('it should not allow an extra key to be sent in', () => {
    const payload: SummaryExceptionListSchema & {
      extraKey?: string;
    } = getSummaryExceptionListSchemaMock();
    payload.extraKey = 'some new value';
    const decoded = summaryExceptionListSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = foldLeftRight(checked);
    expect(getPaths(left(message.errors))).toEqual(['invalid keys "extraKey"']);
    expect(message.schema).toEqual({});
  });
});
