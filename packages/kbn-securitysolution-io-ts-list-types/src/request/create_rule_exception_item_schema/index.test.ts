/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { exactCheck, foldLeftRight, getPaths } from '@kbn/securitysolution-io-ts-utils';
import { pipe } from 'fp-ts/lib/pipeable';
import { left } from 'fp-ts/lib/Either';
import { CreateRuleExceptionListItemSchema, createRuleExceptionListItemSchema } from '.';
import { CreateExceptionListItemSchema } from '../create_exception_list_item_schema';

const getCreateExceptionListItemSchemaMock = (): CreateExceptionListItemSchema => ({
  comments: [],
  description: 'some description',
  entries: [
    {
      field: 'host.name',
      operator: 'included',
      type: 'match_any',
      value: ['foo', 'bar'],
    },
  ],
  item_id: undefined,
  list_id: 'some-list-id',
  name: 'some name',
  namespace_type: 'single',
  os_types: [],
  tags: [],
  type: 'simple',
});

describe('createRuleExceptionListItemSchema', () => {
  test('empty objects do not validate', () => {
    const payload = {} as CreateRuleExceptionListItemSchema;

    const decoded = createRuleExceptionListItemSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "undefined" supplied to "description"',
      'Invalid value "undefined" supplied to "entries"',
      'Invalid value "undefined" supplied to "name"',
      'Invalid value "undefined" supplied to "type"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('items without list_id validate', () => {
    const payload: CreateRuleExceptionListItemSchema = {
      description: 'Exception item for rule default exception list',
      entries: [
        {
          field: 'some.not.nested.field',
          operator: 'included',
          type: 'match',
          value: 'some value',
        },
      ],
      name: 'Sample exception item',
      type: 'simple',
    };

    const decoded = createRuleExceptionListItemSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(
      expect.objectContaining({
        comments: [],
        description: 'Exception item for rule default exception list',
        entries: [
          {
            field: 'some.not.nested.field',
            operator: 'included',
            type: 'match',
            value: 'some value',
          },
        ],
        name: 'Sample exception item',
        os_types: [],
        tags: [],
        type: 'simple',
      })
    );
  });

  test('items with list_id do not validate', () => {
    const payload =
      getCreateExceptionListItemSchemaMock() as unknown as CreateRuleExceptionListItemSchema;

    const decoded = createRuleExceptionListItemSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "some-list-id" supplied to "list_id"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('made up parameters do not validate', () => {
    const payload: Partial<CreateRuleExceptionListItemSchema> & { madeUp: string } = {
      description: 'Exception item for rule default exception list',
      entries: [
        {
          field: 'some.not.nested.field',
          operator: 'included',
          type: 'match',
          value: 'some value',
        },
      ],
      name: 'Sample exception item',
      type: 'simple',
      madeUp: 'invalid value',
    };

    const decoded = createRuleExceptionListItemSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual(['invalid keys "madeUp"']);
    expect(message.schema).toEqual({});
  });
});
