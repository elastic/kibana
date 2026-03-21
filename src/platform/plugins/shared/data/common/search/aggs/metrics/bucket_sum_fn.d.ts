import type { Assign } from '@kbn/utility-types';
import type { ExpressionFunctionDefinition } from '@kbn/expressions-plugin/common';
import type { AggExpressionType, AggExpressionFunctionArgs } from '..';
import { METRIC_TYPES } from '..';
export declare const aggBucketSumFnName = "aggBucketSum";
type Input = any;
type AggArgs = AggExpressionFunctionArgs<typeof METRIC_TYPES.SUM_BUCKET>;
type Arguments = Assign<AggArgs, {
    customBucket?: AggExpressionType;
    customMetric?: AggExpressionType;
}>;
type Output = AggExpressionType;
type FunctionDefinition = ExpressionFunctionDefinition<typeof aggBucketSumFnName, Input, Arguments, Output>;
export declare const aggBucketSum: () => FunctionDefinition;
export {};
