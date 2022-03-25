/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ImportExceptionListSchemaDecoded, ImportExceptionsListSchema } from '.';

export const getImportExceptionsListSchemaMock = (
  listId = 'detection_list_id'
): ImportExceptionsListSchema => ({
  description: 'some description',
  list_id: listId,
  name: 'Query with a rule id',
  type: 'detection',
});

export const getImportExceptionsListSchemaDecodedMock = (
  listId = 'detection_list_id'
): ImportExceptionListSchemaDecoded => ({
  ...getImportExceptionsListSchemaMock(listId),
  immutable: false,
  meta: undefined,
  namespace_type: 'single',
  os_types: [],
  tags: [],
  version: 1,
});
