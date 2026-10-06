import type { Logger } from '@kbn/core/server';
import type { ProcedureName } from '../../../common';
import type { RpcService } from '../rpc_service';
import type { Context } from '../types';
export declare function registerProcedures(rpc: RpcService<Context, ProcedureName>, logger: Logger): void;
