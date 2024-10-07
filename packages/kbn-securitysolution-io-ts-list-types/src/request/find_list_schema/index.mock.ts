/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { FILTER } from '../../constants/index.mock';

import { FindListSchema, FindListSchemaEncoded } from '.';

export const getFindListSchemaMock = (): FindListSchemaEncoded => ({
  filter: FILTER,
  page: '1',
  per_page: '25',
  sort_field: undefined,
  sort_order: undefined,
});

export const getFindListSchemaDecodedMock = (): FindListSchema => ({
  cursor: undefined,
  filter: FILTER,
  page: 1,
  per_page: 25,
  sort_field: undefined,
  sort_order: undefined,
});
