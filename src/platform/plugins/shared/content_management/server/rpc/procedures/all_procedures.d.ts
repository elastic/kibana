import type { Logger } from '@kbn/core/server';
import type { ProcedureName } from '../../../common';
import type { ProcedureDefinition } from '../rpc_service';
import type { Context } from '../types';
export declare const getProcedures: (logger: Logger) => { [key in ProcedureName]: ProcedureDefinition<Context, any, any>; };
