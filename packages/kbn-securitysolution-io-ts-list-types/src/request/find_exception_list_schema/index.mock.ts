/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { FILTER, NAMESPACE_TYPE } from '../../constants/index.mock';

import { FindExceptionListSchema, FindExceptionListSchemaDecoded } from '.';

export const getFindExceptionListSchemaMock = (): FindExceptionListSchema => ({
  filter: FILTER,
  namespace_type: NAMESPACE_TYPE,
  page: '1',
  per_page: '25',
  sort_field: undefined,
  sort_order: undefined,
});

export const getFindExceptionListSchemaDecodedMock = (): FindExceptionListSchemaDecoded => ({
  filter: FILTER,
  namespace_type: [NAMESPACE_TYPE],
  page: 1,
  per_page: 25,
  sort_field: undefined,
  sort_order: undefined,
});
