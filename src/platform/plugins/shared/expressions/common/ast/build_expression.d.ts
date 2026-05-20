import type { AnyExpressionFunctionDefinition } from '../expression_functions/types';
import type { ExpressionAstExpression } from './types';
import type { ExpressionAstFunctionBuilder, InferFunctionDefinition } from './build_function';
/**
 * Type guard that checks whether a given value is an
 * `ExpressionAstExpressionBuilder`. This is useful when working
 * with subexpressions, where you might be retrieving a function
 * argument, and need to know whether it is an expression builder
 * instance which you can perform operations on.
 *
 * @example
 * const arg = myFunction.getArgument('foo');
 * if (isExpressionAstBuilder(foo)) {
 *   foo.toAst();
 * }
 *
 * @param val Value you want to check.
 * @return boolean
 */
export declare function isExpressionAstBuilder(val: unknown): val is ExpressionAstExpressionBuilder;
/** @internal */
export declare function isExpressionAst(val: unknown): val is ExpressionAstExpression;
export interface ExpressionAstExpressionBuilder {
    /**
     * Used to identify expression builder objects.
     */
    type: 'expression_builder';
    /**
     * Array of each of the `buildExpressionFunction()` instances
     * in this expression. Use this to remove or reorder functions
     * in the expression.
     */
    functions: ExpressionAstFunctionBuilder[];
    /**
     * Recursively searches expression for all ocurrences of the
     * function, including in subexpressions.
     *
     * Useful when performing migrations on a specific function,
     * as you can iterate over the array of references and update
     * all functions at once.
     *
     * @param fnName Name of the function to search for.
     * @return `ExpressionAstFunctionBuilder[]`
     */
    findFunction: <FnDef extends AnyExpressionFunctionDefinition = AnyExpressionFunctionDefinition>(fnName: InferFunctionDefinition<FnDef>['name']) => Array<ExpressionAstFunctionBuilder<FnDef>> | [];
    /**
     * Converts expression to an AST.
     *
     * @return `ExpressionAstExpression`
     */
    toAst: () => ExpressionAstExpression;
    /**
     * Converts expression to an expression string.
     *
     * @return `string`
     */
    toString: () => string;
}
/**
 * Makes it easy to progressively build, update, and traverse an
 * expression AST. You can either start with an empty AST, or
 * provide an expression string, AST, or array of expression
 * function builders to use as initial state.
 *
 * @param initialState Optional. An expression string, AST, or array of `ExpressionAstFunctionBuilder[]`.
 * @return `this`
 */
export declare function buildExpression(initialState?: ExpressionAstFunctionBuilder[] | ExpressionAstExpression | string): ExpressionAstExpressionBuilder;
