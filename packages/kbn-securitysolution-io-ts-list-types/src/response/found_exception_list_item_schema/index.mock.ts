/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { FoundExceptionListItemSchema } from '.';
import { getExceptionListItemSchemaMock } from '../exception_list_item_schema/index.mock';

export const getFoundExceptionListItemSchemaMock = (): FoundExceptionListItemSchema => ({
  data: [getExceptionListItemSchemaMock()],
  page: 1,
  per_page: 1,
  total: 1,
});
