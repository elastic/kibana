import type { ExpressionFunctionDefinition, ExpressionValueBoxed } from '@kbn/expressions-plugin/common';
export interface ExtendedBounds {
    min?: number;
    max?: number;
}
export type ExtendedBoundsOutput = ExpressionValueBoxed<'extended_bounds', ExtendedBounds>;
export type ExpressionFunctionExtendedBounds = ExpressionFunctionDefinition<'extendedBounds', null, ExtendedBounds, ExtendedBoundsOutput>;
export declare const extendedBoundsFunction: ExpressionFunctionExtendedBounds;
