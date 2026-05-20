import type { BulkGetIn } from '../../../common';
import type { ProcedureDefinition } from '../rpc_service';
import type { Context } from '../types';
import type { BulkGetResponse } from '../../core/crud';
export declare const bulkGet: ProcedureDefinition<Context, BulkGetIn<string>, BulkGetResponse>;
