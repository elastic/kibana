import type { ExpressionFunctionDefinition } from '../types';
import type { Datatable } from '../../expression_types';
export interface CreateTableArguments {
    ids?: string[];
    names?: string[] | null;
    rowCount?: number;
}
export declare const createTable: ExpressionFunctionDefinition<'createTable', null, CreateTableArguments, Datatable>;
