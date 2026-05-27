import type { Logger } from '@kbn/core/server';
import type { MSearchIn, MSearchOut } from '../../../common';
import type { ProcedureDefinition } from '../rpc_service';
import type { Context } from '../types';
export declare const getMSearch: (logger: Logger) => ProcedureDefinition<Context, MSearchIn, MSearchOut>;
