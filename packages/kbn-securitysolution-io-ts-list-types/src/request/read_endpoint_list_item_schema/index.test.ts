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

import { getReadEndpointListItemSchemaMock } from './index.mock';
import { ReadEndpointListItemSchema, readEndpointListItemSchema } from '.';

describe('read_endpoint_list_item_schema', () => {
  test('it should validate a typical list request', () => {
    const payload = getReadEndpointListItemSchemaMock();
    const decoded = readEndpointListItemSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should accept an undefined for "id"', () => {
    const payload = getReadEndpointListItemSchemaMock();
    delete payload.id;
    const decoded = readEndpointListItemSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should accept an undefined for "item_id"', () => {
    const payload = getReadEndpointListItemSchemaMock();
    delete payload.item_id;
    const decoded = readEndpointListItemSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should NOT accept "namespace_type" since endpoint list items do not need it', () => {
    const payload: ReadEndpointListItemSchema & {
      namespace_type: string;
    } = { ...getReadEndpointListItemSchemaMock(), namespace_type: 'single' };
    // @ts-expect-error
    delete payload.namespace_type;
    const decoded = readEndpointListItemSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(getReadEndpointListItemSchemaMock());
  });

  test('it should accept an undefined for "id", "item_id"', () => {
    const payload = getReadEndpointListItemSchemaMock();
    delete payload.id;
    delete payload.item_id;
    const decoded = readEndpointListItemSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should not allow an extra key to be sent in', () => {
    const payload: ReadEndpointListItemSchema & {
      extraKey?: string;
    } = getReadEndpointListItemSchemaMock();
    payload.extraKey = 'some new value';
    const decoded = readEndpointListItemSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual(['invalid keys "extraKey"']);
    expect(message.schema).toEqual({});
  });
});
