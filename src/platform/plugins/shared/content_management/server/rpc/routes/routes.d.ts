/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IRouter } from '@kbn/core/server';
import type { ProcedureName } from '../../../common';
import type { ContentRegistry } from '../../core';
import type { RpcService } from '../rpc_service';
import type { Context as RpcContext } from '../types';
interface RouteContext {
  rpc: RpcService<RpcContext, ProcedureName>;
  contentRegistry: ContentRegistry;
}
export declare function initRpcRoutes(
  procedureNames: readonly ProcedureName[],
  router: IRouter,
  { rpc, contentRegistry }: RouteContext
): void;
export {};
