import type { Assign } from '@kbn/utility-types';
import type { ExpressionFunctionDefinition } from '@kbn/expressions-plugin/common';
import type { ExtendedBoundsOutput, KibanaTimerangeOutput } from '../../expressions';
import type { AggExpressionType, AggExpressionFunctionArgs } from '..';
import { BUCKET_TYPES } from '..';
export declare const aggDateHistogramFnName = "aggDateHistogram";
type Input = any;
type AggArgs = AggExpressionFunctionArgs<typeof BUCKET_TYPES.DATE_HISTOGRAM>;
type Arguments = Assign<AggArgs, {
    timeRange?: KibanaTimerangeOutput;
    extended_bounds?: ExtendedBoundsOutput;
}>;
type Output = AggExpressionType;
type FunctionDefinition = ExpressionFunctionDefinition<typeof aggDateHistogramFnName, Input, Arguments, Output>;
export declare const aggDateHistogram: () => FunctionDefinition;
export {};
