import type { ExpressionFunctionDefinition, ExpressionValueBoxed } from '@kbn/expressions-plugin/common';
export interface NumericalRange {
    from?: number;
    to?: number;
    label?: string;
}
export type NumericalRangeOutput = ExpressionValueBoxed<'numerical_range', NumericalRange>;
export type ExpressionFunctionNumericalRange = ExpressionFunctionDefinition<'numericalRange', null, NumericalRange, NumericalRangeOutput>;
export declare const numericalRangeFunction: ExpressionFunctionNumericalRange;
