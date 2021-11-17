/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ImportExceptionsResponseSchema } from '.';

export const getImportExceptionsResponseSchemaMock = (): ImportExceptionsResponseSchema => ({
  errors: [],
  success: true,
  success_count: 2,
  success_exception_lists: true,
  success_count_exception_lists: 1,
  success_exception_list_items: true,
  success_count_exception_list_items: 1,
});
