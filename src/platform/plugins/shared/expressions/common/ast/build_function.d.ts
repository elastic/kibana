/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ExpressionAstExpression, ExpressionAstFunction } from './types';
import type {
  AnyExpressionFunctionDefinition,
  ExpressionFunctionDefinition,
} from '../expression_functions/types';
import type { ExpressionAstExpressionBuilder } from './build_expression';
export type InferFunctionDefinition<FnDef extends AnyExpressionFunctionDefinition> =
  FnDef extends ExpressionFunctionDefinition<
    infer Name,
    infer Input,
    infer Arguments,
    infer Output,
    infer Context
  >
    ? {
        name: Name;
        input: Input;
        arguments: Arguments;
        output: Output;
        context: Context;
      }
    : never;
type FunctionArgs<FnDef extends AnyExpressionFunctionDefinition> =
  InferFunctionDefinition<FnDef>['arguments'];
type FunctionArgName<FnDef extends AnyExpressionFunctionDefinition> = {
  [A in keyof FunctionArgs<FnDef>]: A extends string ? A : never;
}[keyof FunctionArgs<FnDef>];
type OptionalKeys<T> = {
  [K in keyof T]-?: {} extends Pick<T, K> ? (K extends string ? K : never) : never;
}[keyof T];
interface FunctionBuilderArguments<FnDef extends AnyExpressionFunctionDefinition> {
  [key: string]: Array<FunctionArgs<FnDef>[string] | ExpressionAstExpressionBuilder>;
}
export interface ExpressionAstFunctionBuilder<
  FnDef extends AnyExpressionFunctionDefinition = AnyExpressionFunctionDefinition
> {
  /**
   * Used to identify expression function builder objects.
   */
  type: 'expression_function_builder';
  /**
   * Name of this expression function.
   */
  name: InferFunctionDefinition<FnDef>['name'];
  /**
   * Object of all args currently added to the function. This is
   * structured similarly to `ExpressionAstFunction['arguments']`,
   * however any subexpressions are returned as expression builder
   * instances instead of expression ASTs.
   */
  arguments: FunctionBuilderArguments<FnDef>;
  /**
   * Adds an additional argument to the function. For multi-args,
   * this should be called once for each new arg. Note that TS
   * will not enforce whether multi-args are available, so only
   * use this to update an existing arg if you are certain it
   * is a multi-arg.
   *
   * @param name The name of the argument to add.
   * @param value The value of the argument to add.
   * @return `this`
   */
  addArgument: <A extends FunctionArgName<FnDef>>(
    name: A,
    value: FunctionArgs<FnDef>[A] | ExpressionAstExpressionBuilder
  ) => this;
  /**
   * Retrieves an existing argument by name.
   * Useful when you want to retrieve the current array of args and add
   * something to it before calling `replaceArgument`. Any subexpression
   * arguments will be returned as expression builder instances.
   *
   * @param name The name of the argument to retrieve.
   * @return `ExpressionAstFunctionBuilderArgument[] | undefined`
   */
  getArgument: <A extends FunctionArgName<FnDef>>(
    name: A
  ) => Array<FunctionArgs<FnDef>[A] | ExpressionAstExpressionBuilder> | undefined;
  /**
   * Overwrites an existing argument with a new value.
   * In order to support multi-args, the value given must always be
   * an array.
   *
   * @param name The name of the argument to replace.
   * @param value The value of the argument. Must always be an array.
   * @return `this`
   */
  replaceArgument: <A extends FunctionArgName<FnDef>>(
    name: A,
    value: Array<FunctionArgs<FnDef>[A] | ExpressionAstExpressionBuilder>
  ) => this;
  /**
   * Removes an (optional) argument from the function.
   *
   * TypeScript will enforce that you only remove optional
   * arguments. For manipulating required args, use `replaceArgument`.
   *
   * @param name The name of the argument to remove.
   * @return `this`
   */
  removeArgument: <A extends OptionalKeys<FunctionArgs<FnDef>>>(name: A) => this;
  /**
   * Converts function to an AST.
   *
   * @return `ExpressionAstFunction`
   */
  toAst: () => ExpressionAstFunction;
  /**
   * Converts function to an expression string.
   *
   * @return `string`
   */
  toString: () => string;
}
/**
 * Manages an AST for a single expression function. The return value
 * can be provided to `buildExpression` to add this function to an
 * expression.
 *
 * Note that to preserve type safety and ensure no args are missing,
 * all required arguments for the specified function must be provided
 * up front. If desired, they can be changed or removed later.
 *
 * @param fnName String representing the name of this expression function.
 * @param initialArgs Object containing the arguments to this function.
 * @return `this`
 */
export declare function buildExpressionFunction<
  FnDef extends AnyExpressionFunctionDefinition = AnyExpressionFunctionDefinition
>(
  fnName: InferFunctionDefinition<FnDef>['name'],
  /**
   * To support subexpressions, we override all args to also accept an
   * ExpressionBuilder. This isn't perfectly typesafe since we don't
   * know with certainty that the builder's output matches the required
   * argument input, so we trust that folks using subexpressions in the
   * builder know what they're doing.
   */
  initialArgs: {
    [K in keyof FunctionArgs<FnDef>]:
      | FunctionArgs<FnDef>[K]
      | ExpressionAstExpressionBuilder
      | ExpressionAstExpressionBuilder[]
      | ExpressionAstExpression
      | ExpressionAstExpression[];
  }
): ExpressionAstFunctionBuilder<FnDef>;
export {};
