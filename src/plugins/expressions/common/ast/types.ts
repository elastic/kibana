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

import { ExpressionValue, ExpressionValueError } from '../expression_types';
import { ExpressionFunction } from '../../common';

export type ExpressionAstNode =
  | ExpressionAstExpression
  | ExpressionAstFunction
  | ExpressionAstArgument;

export interface ExpressionAstExpression {
  type: 'expression';
  chain: ExpressionAstFunction[];
}

export interface ExpressionAstFunction {
  type: 'function';
  function: string;
  arguments: Record<string, ExpressionAstArgument[]>;

  /**
   * Debug information added to each function when expression is executed in *debug mode*.
   */
  debug?: ExpressionAstFunctionDebug;
}

export interface ExpressionAstFunctionDebug {
  /**
   * True if function successfully returned output, false if function threw.
   */
  success: boolean;

  /**
   * Reference to the expression function this AST node represents.
   */
  fn: ExpressionFunction;

  /**
   * Input that expression function received as its first argument.
   */
  input: ExpressionValue;

  /**
   * Map of resolved arguments expression function received as its second argument.
   */
  args: Record<string, ExpressionValue>;

  /**
   * Result returned by the expression function. Including an error result
   * if it was returned by the function (not thrown).
   */
  output?: ExpressionValue;

  /**
   * Error that function threw normalized to `ExpressionValueError`.
   */
  error?: ExpressionValueError;

  /**
   * Raw error that was thrown by the function, if any.
   */
  rawError?: any | Error;

  /**
   * Time in milliseconds it took to execute the function. Duration can be
   * `undefined` if error happened during argument resolution, because function
   * timing starts after the arguments have been resolved.
   */
  duration: number | undefined;
}

export type ExpressionAstArgument = string | boolean | number | ExpressionAstExpression;
