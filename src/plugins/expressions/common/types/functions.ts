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

import { ArgumentType } from './arguments';
import { TypeToString, UnwrapPromise } from './common';
import { Type } from '../executor/expression_types';

/**
 * `ExecutionContext` is an object available to all functions during a single execution;
 * it provides various methods to perform side-effects.
 */
export interface ExecutionContext {
  /**
   * Get initial input with which execution started.
   */
  getInitialInput: () => unknown;

  /**
   * Same as `getInitialInput`, use `getInitialInput` instead, `getInitialContext` is deprecated.
   *
   * @deprecated
   */
  getInitialContext: () => unknown;

  /**
   * Context variables that can be consumed using `var` and `var_set` functions.
   */
  variables: Record<string, unknown>;

  /**
   * A map of available expression types.
   */
  types: Record<string, Type>;

  /**
   * Adds ability to abort current execution.
   */
  abortSignal?: AbortSignal;

  /**
   * Adapters for `inspector` plugin.
   */
  inspectorAdapters?: unknown;
}

/**
 * `ExpressionFunctionDefinition` is the interface plugins have to implement to
 * register a function in `expressions` plugin.
 */
export interface ExpressionFunctionDefinition<Name extends string, Input, Arguments, Return> {
  /**
   * The name of the function, as will be used in expression.
   */
  name: Name;

  /**
   * A string identifier that identifies the type of value this function returns.
   */
  type?: TypeToString<UnwrapPromise<Return>>;

  /**
   * Specification of arguments that function supports. This list will also be
   * used for autocomplete functionality when your function is being edited.
   */
  args: { [key in keyof Arguments]: ArgumentType<Arguments[key]> };

  aliases?: string[];
  context?: {
    types: Array<TypeToString<Input>>;
  };

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
   *     is created for the duration of the execution of expression an is the
   *     same for all functions.
   */
  fn(input: Input, args: Arguments, context: ExecutionContext): Return;
}

export type AnyExpressionFunctionDefinition = ExpressionFunctionDefinition<string, any, any, any>;
