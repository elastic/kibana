import type { Assign } from '@kbn/utility-types';
import type { ExpressionFunctionDefinition } from '@kbn/expressions-plugin/common';
import type { ExtendedBoundsOutput } from '../../expressions';
import type { AggExpressionType, AggExpressionFunctionArgs } from '..';
import { BUCKET_TYPES } from '..';
export declare const aggHistogramFnName = "aggHistogram";
type Input = any;
type AggArgs = AggExpressionFunctionArgs<typeof BUCKET_TYPES.HISTOGRAM>;
type Arguments = Assign<AggArgs, {
    extended_bounds?: ExtendedBoundsOutput;
}>;
type Output = AggExpressionType;
type FunctionDefinition = ExpressionFunctionDefinition<typeof aggHistogramFnName, Input, Arguments, Output>;
export declare const aggHistogram: () => FunctionDefinition;
export {};
