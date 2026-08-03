import type { Assign } from '@kbn/utility-types';
import type { ExpressionFunctionDefinition } from '@kbn/expressions-plugin/common';
import type { AggExpressionType, AggExpressionFunctionArgs } from '..';
import { BUCKET_TYPES } from '..';
export declare const aggMultiTermsFnName = "aggMultiTerms";
type Input = any;
type AggArgs = AggExpressionFunctionArgs<typeof BUCKET_TYPES.MULTI_TERMS>;
type Arguments = Assign<AggArgs, {
    orderAgg?: AggExpressionType;
}>;
type Output = AggExpressionType;
type FunctionDefinition = ExpressionFunctionDefinition<typeof aggMultiTermsFnName, Input, Arguments, Output>;
export declare const aggMultiTerms: () => FunctionDefinition;
export {};
