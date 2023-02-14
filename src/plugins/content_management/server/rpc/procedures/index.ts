/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ProcedureName } from '../../../common';
import type { RpcService } from '../rpc_service';
import type { Context } from '../types';
import { registerGet } from './get';
import { registerCreate } from './create';

export function registerProcedures(rpc: RpcService<Context, ProcedureName>) {
  registerGet(rpc);
  registerCreate(rpc);
}
