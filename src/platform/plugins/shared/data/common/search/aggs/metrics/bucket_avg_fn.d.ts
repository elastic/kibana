import type { Assign } from '@kbn/utility-types';
import type { ExpressionFunctionDefinition } from '@kbn/expressions-plugin/common';
import type { AggExpressionType, AggExpressionFunctionArgs } from '..';
import { METRIC_TYPES } from '..';
export declare const aggBucketAvgFnName = "aggBucketAvg";
type Input = any;
type AggArgs = AggExpressionFunctionArgs<typeof METRIC_TYPES.AVG_BUCKET>;
type Arguments = Assign<AggArgs, {
    customBucket?: AggExpressionType;
    customMetric?: AggExpressionType;
}>;
type Output = AggExpressionType;
type FunctionDefinition = ExpressionFunctionDefinition<typeof aggBucketAvgFnName, Input, Arguments, Output>;
export declare const aggBucketAvg: () => FunctionDefinition;
export {};
