/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ProcedureName } from './constants';
import type { ProcedureSchemas } from './types';
import { getSchemas } from './get';
import { bulkGetSchemas } from './bulk_get';
import { createSchemas } from './create';
import { updateSchemas } from './update';
import { deleteSchemas } from './delete';
import { searchSchemas } from './search';
import { mSearchSchemas } from './msearch';

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
