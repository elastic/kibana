import type { ExpressionAstExpression } from './types';
/**
 * Given expression pipeline string, returns parsed AST.
 *
 * @param expression Expression pipeline string.
 */
export declare function parseExpression(expression: string): ExpressionAstExpression;
