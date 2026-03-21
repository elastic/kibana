import type { ExpressionFunctionDefinition, ExpressionValueBoxed } from '@kbn/expressions-plugin/common';
export interface DateRange {
    from: number | string;
    to: number | string;
}
export type DateRangeOutput = ExpressionValueBoxed<'date_range', DateRange>;
export type ExpressionFunctionDateRange = ExpressionFunctionDefinition<'dateRange', null, DateRange, DateRangeOutput>;
export declare const dateRangeFunction: ExpressionFunctionDateRange;
