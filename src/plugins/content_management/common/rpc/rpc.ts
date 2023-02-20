/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ProcedureName } from './constants';
import type { ProcedureSchemas } from './types';
import { getSchemas } from './get';
import { createSchemas } from './create';
import { updateSchemas } from './update';
import { deleteSchemas } from './delete';
import { searchSchemas } from './search';

export const schemas: {
  [key in ProcedureName]: ProcedureSchemas;
} = {
  get: getSchemas,
  create: createSchemas,
  update: updateSchemas,
  delete: deleteSchemas,
  search: searchSchemas,
};
