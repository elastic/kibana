import type { Assign } from '@kbn/utility-types';
import type { ExpressionFunctionDefinition } from '@kbn/expressions-plugin/common';
import type { QueryFilterOutput } from '../../expressions';
import type { AggExpressionType, AggExpressionFunctionArgs } from '..';
import { BUCKET_TYPES } from '..';
export declare const aggFiltersFnName = "aggFilters";
type Input = any;
type AggArgs = AggExpressionFunctionArgs<typeof BUCKET_TYPES.FILTERS>;
type Arguments = Assign<AggArgs, {
    filters?: QueryFilterOutput[];
}>;
type Output = AggExpressionType;
type FunctionDefinition = ExpressionFunctionDefinition<typeof aggFiltersFnName, Input, Arguments, Output>;
export declare const aggFilters: () => FunctionDefinition;
export {};
