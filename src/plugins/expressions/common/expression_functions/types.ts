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
import { ArgumentType } from '../types/arguments';
import { TypeToString } from '../types/common';
import { ExecutionContext } from '../types';

/**
 * `ExpressionFunctionDefinition` is the interface plugins have to implement to
 * register a function in `expressions` plugin.
 */
export interface ExpressionFunctionDefinition<
  Name extends string,
  Input,
  Arguments,
  Output,
  Context extends ExecutionContext = ExecutionContext
> {
  /**
   * The name of the function, as will be used in expression.
   */
  name: Name;

  /**
   * A string identifier that identifies the type of value this function returns.
   */
  type?: TypeToString<UnwrapPromiseOrReturn<Output>>;

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
   * List of input types this function supports.
   */
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
   *     is created for the duration of the execution of expression and is the
   *     same for all functions in expression chain.
   */
  fn(input: Input, args: Arguments, context: Context): Output;
}

/**
 * Type to capture every possible expression function definition.
 */
export type AnyExpressionFunctionDefinition = ExpressionFunctionDefinition<any, any, any, any>;
