import type { Assign } from '@kbn/utility-types';
import type { ExpressionFunctionDefinition } from '@kbn/expressions-plugin/common';
import type { AggExpressionType, AggExpressionFunctionArgs } from '..';
import { METRIC_TYPES } from '..';
export declare const aggCumulativeSumFnName = "aggCumulativeSum";
type Input = any;
type AggArgs = AggExpressionFunctionArgs<typeof METRIC_TYPES.CUMULATIVE_SUM>;
type Arguments = Assign<AggArgs, {
    customMetric?: AggExpressionType;
}>;
type Output = AggExpressionType;
type FunctionDefinition = ExpressionFunctionDefinition<typeof aggCumulativeSumFnName, Input, Arguments, Output>;
export declare const aggCumulativeSum: () => FunctionDefinition;
export {};
