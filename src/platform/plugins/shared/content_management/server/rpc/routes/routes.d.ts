import type { IRouter } from '@kbn/core/server';
import type { ProcedureName } from '../../../common';
import type { ContentRegistry } from '../../core';
import type { RpcService } from '../rpc_service';
import type { Context as RpcContext } from '../types';
interface RouteContext {
    rpc: RpcService<RpcContext, ProcedureName>;
    contentRegistry: ContentRegistry;
}
export declare function initRpcRoutes(procedureNames: readonly ProcedureName[], router: IRouter, { rpc, contentRegistry }: RouteContext): void;
export {};
