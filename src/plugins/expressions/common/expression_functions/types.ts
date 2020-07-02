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

import { UnwrapPromiseOrReturn } from '@kbn/utility-types';
import { ArgumentType } from './arguments';
import { TypeToString } from '../types/common';
import { ExecutionContext } from '../execution/types';
import {
  ExpressionFunctionClog,
  ExpressionFunctionFont,
  ExpressionFunctionKibanaContext,
  ExpressionFunctionKibana,
  ExpressionFunctionVarSet,
  ExpressionFunctionVar,
} from './specs';

/**
 * `ExpressionFunctionDefinition` is the interface plugins have to implement to
 * register a function in `expressions` plugin.
 */
export interface ExpressionFunctionDefinition<
  Name extends string,
  Input,
  Arguments extends Record<string, any>,
  Output,
  Context extends ExecutionContext = ExecutionContext
> {
  /**
   * The name of the function, as will be used in expression.
   */
  name: Name;

  /**
   * Name of type of value this function outputs.
   */
  type?: TypeToString<UnwrapPromiseOrReturn<Output>>;

  /**
   * List of allowed type names for input value of this function. If this
   * property is set the input of function will be cast to the first possible
   * type in this list. If this property is missing the input will be provided
   * to the function as-is.
   */
  inputTypes?: Array<TypeToString<Input>>;

  /**
   * Specification of arguments that function supports. This list will also be
   * used for autocomplete functionality when your function is being edited.
   */
  args: { [key in keyof Arguments]: ArgumentType<Arguments[key]> };

  /**
   * @todo What is this?
   */
  aliases?: string[];

  /**
   * Help text displayed in the Expression editor. This text should be
   * internationalized.
   */
  help: string;

  /**
   * The actual implementation of the function.
   *
   * @param input Output of the previous function, or initial input.
   * @param args Parameters set for this function in expression.
   * @param context Object with functions to perform side effects. This object
   *     is created for the duration of the execution of expression and is the
   *     same for all functions in expression chain.
   */
  fn(input: Input, args: Arguments, context: Context): Output;

  /**
   * @deprecated Use `inputTypes` instead.
   */
  context?: {
    /**
     * @deprecated This is alias for `inputTypes`, use `inputTypes` instead.
     */
    types: AnyExpressionFunctionDefinition['inputTypes'];
  };
}

/**
 * Type to capture every possible expression function definition.
 */
export type AnyExpressionFunctionDefinition = ExpressionFunctionDefinition<
  string,
  any,
  Record<string, any>,
  any
>;

/**
 * A mapping of `ExpressionFunctionDefinition`s for functions which the
 * Expressions services provides out-of-the-box. Any new functions registered
 * by the Expressions plugin should have their types added here.
 *
 * @public
 */
export interface ExpressionFunctionDefinitions {
  clog: ExpressionFunctionClog;
  font: ExpressionFunctionFont;
  kibana_context: ExpressionFunctionKibanaContext;
  kibana: ExpressionFunctionKibana;
  var_set: ExpressionFunctionVarSet;
  var: ExpressionFunctionVar;
}
