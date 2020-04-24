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

import { ExpressionAstExpression, ExpressionAstFunction } from './types';
import { buildExpressionFunction, ExpressionAstFunctionBuilder } from './build_function';
import { format } from './format';
import { parse } from './parse';

export interface ExpressionAstExpressionBuilder {
  /**
   * Adds a new function to the end of the expression chain.
   * Functions must be created using `createExpressionFunction()`.
   *
   * @param fnBuilder A `ExpressionAstFunctionBuilder` instance.
   * @return `this`
   */
  addFunction: (fnBuilder: ExpressionAstFunctionBuilder) => this;
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
  findFunction: (fnName: string) => ExpressionAstFunctionBuilder[] | [];
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
  chain: fns.map(fn => fn.toAst()),
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
    chain.map(fn => buildExpressionFunction(fn.function, fn.arguments));

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
    addFunction(fn) {
      fns.push(fn);
      return this;
    },

    findFunction(fnName) {
      const foundFns: ExpressionAstFunctionBuilder[] = [];
      return fns.reduce((found, currFn) => {
        Object.values(currFn.arguments).forEach(values => {
          values.forEach(value => {
            if (typeof value === 'object' && value.chain.length > 0) {
              // `value` is a subexpression, recurse and continue searching
              found = found.concat(buildExpression(value).findFunction(fnName));
            }
          });
        });
        if (currFn.name === fnName) {
          found.push(currFn);
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
