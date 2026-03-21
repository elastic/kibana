import type { Assign } from '@kbn/utility-types';
import type { ExpressionFunctionDefinition } from '@kbn/expressions-plugin/common';
import type { AggExpressionType, AggExpressionFunctionArgs } from '..';
import { BUCKET_TYPES } from '..';
export declare const aggTermsFnName = "aggTerms";
type Input = any;
type AggArgs = AggExpressionFunctionArgs<typeof BUCKET_TYPES.TERMS>;
type Arguments = Assign<AggArgs, {
    orderAgg?: AggExpressionType;
}>;
type Output = AggExpressionType;
type FunctionDefinition = ExpressionFunctionDefinition<typeof aggTermsFnName, Input, Arguments, Output>;
export declare const aggTerms: () => FunctionDefinition;
export {};
