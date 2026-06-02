import type { ExpressionAstExpression, ExpressionAstArgument } from './types';
export declare function parse<E extends string, S extends 'expression' | 'argument'>(expression: E, startRule: S): S extends 'expression' ? ExpressionAstExpression : ExpressionAstArgument;
