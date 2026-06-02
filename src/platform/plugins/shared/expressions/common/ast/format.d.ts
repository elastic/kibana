import type { ExpressionAstExpression, ExpressionAstArgument } from './types';
export declare function format<T extends ExpressionAstExpression | ExpressionAstArgument>(ast: T, type: T extends ExpressionAstExpression ? 'expression' : 'argument'): string;
