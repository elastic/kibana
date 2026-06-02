import type { ExpressionTypeDefinition, ExpressionValueBoxed } from '../types';
export type ExpressionValueNum = ExpressionValueBoxed<'num', {
    value: number;
}>;
export declare const num: ExpressionTypeDefinition<'num', ExpressionValueNum>;
