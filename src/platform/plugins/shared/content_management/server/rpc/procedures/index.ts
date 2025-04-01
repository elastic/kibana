/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ProcedureName } from '../../../common';
import type { RpcService } from '../rpc_service';
import type { Context } from '../types';
import { procedures } from './all_procedures';

// Type utility to correclty set the type of JS Object.entries()
type Entries<T> = Array<
  {
    [K in keyof T]: [K, T[K]];
  }[keyof T]
>;

export function registerProcedures(rpc: RpcService<Context, ProcedureName>) {
  (Object.entries(procedures) as Entries<typeof procedures>).forEach(([name, definition]) => {
    rpc.register(name, definition);
  });
}
