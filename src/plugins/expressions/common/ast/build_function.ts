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

import { ExpressionAstArgument, ExpressionAstFunction } from './types';
import {
  ExpressionFunctionDefinition,
  ExpressionFunctionDefinitions,
} from '../expression_functions/types';

// Gets all optional string keys from an interface.
type OptionalKeys<T> = {
  [K in keyof T]-?: {} extends Pick<T, K> ? (K extends string ? K : never) : never;
}[keyof T];

// Infers the expression arguments from an ExpressionFunctionDefinition.
type FunctionArgs<
  Name extends string
> = ExpressionFunctionDefinitions[Name] extends ExpressionFunctionDefinition<
  infer Name,
  infer Input,
  infer Arguments,
  infer Output,
  infer Context
>
  ? Arguments
  : never;

// Gets a list of possible arg names for a given function.
type FunctionArgName<F extends string> = {
  [A in keyof FunctionArgs<F>]: A extends string ? A : never;
}[keyof FunctionArgs<F>];

export interface ExpressionAstFunctionBuilder<Fn extends string = string> {
  /**
   * Name of this expression function.
   */
  name: Fn;
  /**
   * AST representation of all args currently added to the function.
   */
  arguments: ExpressionAstFunction['arguments'];
  /**
   * Adds an additional argument to the function.
   * Note that you can only use this method for arguments which do not
   * yet exist. To update an existing argument, use `replaceArgument`.
   *
   * @param name The name of the argument to add.
   * @param value The value of the argument. Can be a single value or an array.
   * @return `this`
   */
  addArgument: <A extends FunctionArgName<Fn>>(name: A, value: FunctionArgs<Fn>[A]) => this;
  /**
   * Retrieves an existing argument by name.
   * Useful when you want to retrieve the current array of args and add
   * something to it before calling `replaceArgument`.
   *
   * @param name The name of the argument to retrieve.
   * @return `ExpressionAstArgument[]`
   */
  getArgument: <A extends FunctionArgName<Fn>>(name: A) => ExpressionAstArgument[] | undefined;
  /**
   * Overwrites an existing argument with a new value.
   * In order to support multi-args, the value given must always be
   * an array.
   *
   * @param name The name of the argument to replace.
   * @param value The value of the argument. Must always be an array.
   * @return `this`
   */
  replaceArgument: <A extends FunctionArgName<Fn>>(
    name: A,
    value: Array<FunctionArgs<Fn>[A]>
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
  removeArgument: <A extends OptionalKeys<FunctionArgs<Fn>>>(name: A) => this;
  /**
   * Converts function to an AST.
   *
   * @return `ExpressionAstFunction`
   */
  toAst: () => ExpressionAstFunction;
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
export function buildExpressionFunction<F extends string>(
  fnName: F,
  initialArgs: FunctionArgs<F>
): ExpressionAstFunctionBuilder<F> {
  const args: ExpressionAstFunction['arguments'] = initialArgs;
  Object.entries(initialArgs).forEach(([key, value]) => {
    args[key] = Array.isArray(value) ? value : [value];
  });

  return {
    name: fnName,
    arguments: args,

    addArgument(key, value) {
      if (args.hasOwnProperty(key)) {
        throw new Error('Argument already exists on this function');
      }
      args[key] = Array.isArray(value) ? value : [value];
      return this;
    },

    getArgument(key) {
      if (!args.hasOwnProperty(key)) {
        return;
      }
      return args[key];
    },

    replaceArgument(key, value) {
      if (!args.hasOwnProperty(key)) {
        throw new Error('Argument to replace does not exist on this function');
      }
      args[key] = value;
      return this;
    },

    removeArgument(key) {
      delete args[key];
      return this;
    },

    toAst() {
      return {
        type: 'function',
        function: fnName,
        arguments: args,
      };
    },
  };
}
