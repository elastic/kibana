import type { ExpressionFunctionDefinition, ExpressionValueBoxed } from '@kbn/expressions-plugin/common';
import type { Query } from '../../query';
import type { KibanaQueryOutput } from './kibana_context_type';
export interface QueryFilter {
    input: Query;
    label?: string;
}
export type QueryFilterOutput = ExpressionValueBoxed<'kibana_query_filter', QueryFilter>;
interface QueryFilterArguments {
    input: KibanaQueryOutput;
    label?: string;
}
export type ExpressionFunctionQueryFilter = ExpressionFunctionDefinition<'queryFilter', null, QueryFilterArguments, QueryFilterOutput>;
export declare const queryFilterFunction: ExpressionFunctionQueryFilter;
export {};
