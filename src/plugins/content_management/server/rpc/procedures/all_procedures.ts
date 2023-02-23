/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { ProcedureName } from '../../../common';
import type { ProcedureDefinition } from '../rpc_service';
import type { Context } from '../types';
import { get } from './get';
import { bulkGet } from './bulk_get';
import { create } from './create';
import { update } from './update';
import { deleteProc } from './delete';
import { search } from './search';

export const procedures: { [key in ProcedureName]: ProcedureDefinition<Context, any, any> } = {
  get,
  bulkGet,
  create,
  update,
  delete: deleteProc,
  search,
};
