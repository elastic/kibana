/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { bulkGetSchemas } from './bulk_get';
import type { ProcedureName } from './constants';
import { createSchemas } from './create';
import { deleteSchemas } from './delete';
import { getSchemas } from './get';
import { mSearchSchemas } from './msearch';
import { searchSchemas } from './search';
import type { ProcedureSchemas } from './types';
import { updateSchemas } from './update';

export const schemas: {
  [key in ProcedureName]: ProcedureSchemas;
} = {
  get: getSchemas,
  bulkGet: bulkGetSchemas,
  create: createSchemas,
  update: updateSchemas,
  delete: deleteSchemas,
  search: searchSchemas,
  mSearch: mSearchSchemas,
};
