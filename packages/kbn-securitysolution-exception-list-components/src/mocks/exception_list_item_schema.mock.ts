/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';

export const getExceptionListItemSchemaMock = (
  overrides?: Partial<ExceptionListItemSchema>
): ExceptionListItemSchema => ({
  _version: undefined,
  comments: [],
  created_at: '2020-04-20T15:25:31.830Z',
  created_by: 'some user',
  description: 'some description',
  entries: [
    {
      entries: [
        { field: 'nested.field', operator: 'included', type: 'match', value: 'some value' },
      ],
      field: 'some.parentField',
      type: 'nested',
    },
    { field: 'some.not.nested.field', operator: 'included', type: 'match', value: 'some value' },
  ],
  id: '1',
  item_id: 'endpoint_list_item',
  list_id: 'endpoint_list_id',
  meta: {},
  name: 'some name',
  namespace_type: 'single',
  os_types: [],
  tags: ['user added string for a tag', 'malware'],
  tie_breaker_id: '6a76b69d-80df-4ab2-8c3e-85f466b06a0e',
  type: 'simple',
  updated_at: '2020-04-20T15:25:31.830Z',
  updated_by: 'some user',
  ...(overrides || {}),
});
