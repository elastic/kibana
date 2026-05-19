import type { Assign } from '@kbn/utility-types';
import type { ExpressionFunctionDefinition } from '@kbn/expressions-plugin/common';
import type { AggExpressionType, AggExpressionFunctionArgs } from '..';
import { METRIC_TYPES } from '..';
export declare const aggSerialDiffFnName = "aggSerialDiff";
type Input = any;
type AggArgs = AggExpressionFunctionArgs<typeof METRIC_TYPES.SERIAL_DIFF>;
type Arguments = Assign<AggArgs, {
    customMetric?: AggExpressionType;
}>;
type Output = AggExpressionType;
type FunctionDefinition = ExpressionFunctionDefinition<typeof aggSerialDiffFnName, Input, Arguments, Output>;
export declare const aggSerialDiff: () => FunctionDefinition;
export {};
