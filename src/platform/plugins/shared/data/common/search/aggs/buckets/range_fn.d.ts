import type { Assign } from '@kbn/utility-types';
import type { ExpressionFunctionDefinition } from '@kbn/expressions-plugin/common';
import type { NumericalRangeOutput } from '../../expressions';
import type { AggExpressionType, AggExpressionFunctionArgs } from '..';
import { BUCKET_TYPES } from '..';
export declare const aggRangeFnName = "aggRange";
type Input = any;
type AggArgs = AggExpressionFunctionArgs<typeof BUCKET_TYPES.RANGE>;
type Arguments = Assign<AggArgs, {
    ranges?: NumericalRangeOutput[];
}>;
type Output = AggExpressionType;
type FunctionDefinition = ExpressionFunctionDefinition<typeof aggRangeFnName, Input, Arguments, Output>;
export declare const aggRange: () => FunctionDefinition;
export {};
