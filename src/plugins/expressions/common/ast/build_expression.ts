/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { AnyExpressionFunctionDefinition } from '../expression_functions/types';
import { ExpressionAstExpression, ExpressionAstFunction } from './types';
import {
  buildExpressionFunction,
  ExpressionAstFunctionBuilder,
  InferFunctionDefinition,
} from './build_function';
import { format } from './format';
import { parse } from './parse';

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
export function isExpressionAstBuilder(val: any): val is ExpressionAstExpressionBuilder {
  return val?.type === 'expression_builder';
}

/** @internal */
export function isExpressionAst(val: any): val is ExpressionAstExpression {
  return val?.type === 'expression';
}

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
  findFunction: <FnDef extends AnyExpressionFunctionDefinition = AnyExpressionFunctionDefinition>(
    fnName: InferFunctionDefinition<FnDef>['name']
  ) => Array<ExpressionAstFunctionBuilder<FnDef>> | [];
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

const generateExpressionAst = (fns: ExpressionAstFunctionBuilder[]): ExpressionAstExpression => ({
  type: 'expression',
  chain: fns.map((fn) => fn.toAst()),
});

/**
 * Makes it easy to progressively build, update, and traverse an
 * expression AST. You can either start with an empty AST, or
 * provide an expression string, AST, or array of expression
 * function builders to use as initial state.
 *
 * @param initialState Optional. An expression string, AST, or array of `ExpressionAstFunctionBuilder[]`.
 * @return `this`
 */
export function buildExpression(
  initialState?: ExpressionAstFunctionBuilder[] | ExpressionAstExpression | string
): ExpressionAstExpressionBuilder {
  const chainToFunctionBuilder = (chain: ExpressionAstFunction[]): ExpressionAstFunctionBuilder[] =>
    chain.map((fn) => buildExpressionFunction(fn.function, fn.arguments));

  // Takes `initialState` and converts it to an array of `ExpressionAstFunctionBuilder`
  const extractFunctionsFromState = (
    state: ExpressionAstFunctionBuilder[] | ExpressionAstExpression | string
  ): ExpressionAstFunctionBuilder[] => {
    if (typeof state === 'string') {
      return chainToFunctionBuilder(parse(state, 'expression').chain);
    } else if (!Array.isArray(state)) {
      // If it isn't an array, it is an `ExpressionAstExpression`
      return chainToFunctionBuilder(state.chain);
    }
    return state;
  };

  const fns: ExpressionAstFunctionBuilder[] = initialState
    ? extractFunctionsFromState(initialState)
    : [];

  return {
    type: 'expression_builder',
    functions: fns,

    findFunction<FnDef extends AnyExpressionFunctionDefinition>(
      fnName: InferFunctionDefinition<FnDef>['name']
    ) {
      const foundFns: Array<ExpressionAstFunctionBuilder<FnDef>> = [];
      return fns.reduce((found, currFn) => {
        Object.values(currFn.arguments).forEach((values) => {
          values.forEach((value) => {
            if (isExpressionAstBuilder(value)) {
              // `value` is a subexpression, recurse and continue searching
              found = found.concat(value.findFunction(fnName));
            }
          });
        });
        if (currFn.name === fnName) {
          found.push(currFn as ExpressionAstFunctionBuilder<FnDef>);
        }
        return found;
      }, foundFns);
    },

    toAst() {
      if (fns.length < 1) {
        throw new Error('Functions have not been added to the expression builder');
      }
      return generateExpressionAst(fns);
    },

    toString() {
      if (fns.length < 1) {
        throw new Error('Functions have not been added to the expression builder');
      }
      return format(generateExpressionAst(fns), 'expression');
    },
  };
}
