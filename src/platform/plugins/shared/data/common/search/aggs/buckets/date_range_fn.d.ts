import type { Assign } from '@kbn/utility-types';
import type { ExpressionFunctionDefinition } from '@kbn/expressions-plugin/common';
import type { DateRangeOutput } from '../../expressions';
import type { AggExpressionType, AggExpressionFunctionArgs } from '..';
import { BUCKET_TYPES } from '..';
export declare const aggDateRangeFnName = "aggDateRange";
type Input = any;
type AggArgs = AggExpressionFunctionArgs<typeof BUCKET_TYPES.DATE_RANGE>;
type Arguments = Assign<AggArgs, {
    ranges?: DateRangeOutput[];
}>;
type Output = AggExpressionType;
type FunctionDefinition = ExpressionFunctionDefinition<typeof aggDateRangeFnName, Input, Arguments, Output>;
export declare const aggDateRange: () => FunctionDefinition;
export {};
