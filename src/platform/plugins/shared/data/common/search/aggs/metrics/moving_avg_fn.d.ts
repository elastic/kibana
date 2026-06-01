import type { Assign } from '@kbn/utility-types';
import type { ExpressionFunctionDefinition } from '@kbn/expressions-plugin/common';
import type { AggExpressionType, AggExpressionFunctionArgs } from '..';
import { METRIC_TYPES } from '..';
export declare const aggMovingAvgFnName = "aggMovingAvg";
type Input = any;
type AggArgs = AggExpressionFunctionArgs<typeof METRIC_TYPES.MOVING_FN>;
type Arguments = Assign<AggArgs, {
    customMetric?: AggExpressionType;
}>;
type Output = AggExpressionType;
type FunctionDefinition = ExpressionFunctionDefinition<typeof aggMovingAvgFnName, Input, Arguments, Output>;
export declare const aggMovingAvg: () => FunctionDefinition;
export {};
