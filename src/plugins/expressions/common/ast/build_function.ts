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

import { ExpressionAstFunction } from './types';
import {
  ExpressionFunctionDefinition,
  ExpressionFunctionDefinitions,
} from '../expression_functions/types';
import {
  buildExpression,
  ExpressionAstExpressionBuilder,
  isExpressionBuilder,
  isExpressionAst,
} from './build_expression';
import { format } from './format';

// Infers the types from an ExpressionFunctionDefinition.
type InferFunctionDefinition<
  Name extends string
> = ExpressionFunctionDefinitions[Name] extends ExpressionFunctionDefinition<
  infer Name,
  infer Input,
  infer Arguments,
  infer Output,
  infer Context
>
  ? { name: Name; input: Input; arguments: Arguments; output: Output; context: Context }
  : never;

// Shortcut for inferring args from a function definition.
type FunctionArgs<Fn extends string> = InferFunctionDefinition<Fn>['arguments'];

// Gets a list of possible arg names for a given function.
type FunctionArgName<F extends string> = {
  [A in keyof FunctionArgs<F>]: A extends string ? A : never;
}[keyof FunctionArgs<F>];

// Gets all optional string keys from an interface.
type OptionalKeys<T> = {
  [K in keyof T]-?: {} extends Pick<T, K> ? (K extends string ? K : never) : never;
}[keyof T];

type ExpressionAstFunctionBuilderArgument =
  | string
  | number
  | boolean
  | ExpressionAstExpressionBuilder;

export interface ExpressionAstFunctionBuilder<Fn extends string = string> {
  /**
   * Used to identify expression function builder objects.
   */
  type: 'expression_function_builder';
  /**
   * Name of this expression function.
   */
  name: Fn;
  /**
   * Object of all args currently added to the function. This is
   * structured similarly to `ExpressionAstFunction['arguments']`,
   * however any subexpressions are returned as expression builder
   * instances instead of expression ASTs.
   */
  arguments: Record<string, ExpressionAstFunctionBuilderArgument[]>;
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
  addArgument: <A extends FunctionArgName<Fn>>(
    name: A,
    value: FunctionArgs<Fn>[A] | ExpressionAstExpressionBuilder
  ) => this;
  /**
   * Retrieves an existing argument by name.
   * Useful when you want to retrieve the current array of args and add
   * something to it before calling `replaceArgument`. Any subexpression
   * arguments will be returned as expression builder instances.
   *
   * @param name The name of the argument to retrieve.
   * @return `ExpressionAstFunctionBuilderArgument[]`
   */
  getArgument: <A extends FunctionArgName<Fn>>(
    name: A
  ) => ExpressionAstFunctionBuilderArgument[] | undefined;
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
export function buildExpressionFunction<F extends string>(
  fnName: F,
  /**
   * To support subexpressions, we override all args to also accept an
   * ExpressionBuilder. This isn't perfectly typesafe since we don't
   * know with certainty that the builder's output matches the required
   * argument input, so we trust that folks using subexpressions in the
   * builder know what they're doing.
   */
  initialArgs: {
    [K in keyof FunctionArgs<F>]:
      | FunctionArgs<F>[K]
      | ExpressionAstExpressionBuilder
      | ExpressionAstExpressionBuilder[];
  }
): ExpressionAstFunctionBuilder<F> {
  const args = Object.entries(initialArgs).reduce((acc, [key, value]) => {
    if (Array.isArray(value)) {
      acc[key] = value.map(v => {
        return isExpressionAst(v) ? buildExpression(v) : v;
      });
    } else {
      acc[key] = isExpressionAst(value) ? [buildExpression(value)] : [value];
    }
    return acc;
  }, initialArgs as Record<string, ExpressionAstFunctionBuilderArgument[]>);

  return {
    type: 'expression_function_builder',
    name: fnName,
    arguments: args,

    addArgument(key, value) {
      if (!args.hasOwnProperty(key)) {
        args[key] = [];
      }
      args[key].push(value);
      return this;
    },

    getArgument(key) {
      if (!args.hasOwnProperty(key)) {
        return;
      }
      return args[key];
    },

    replaceArgument(key, values) {
      if (!args.hasOwnProperty(key)) {
        throw new Error('Argument to replace does not exist on this function');
      }

      values.forEach((val, i) => {
        if (isExpressionBuilder(val)) {
          values[i] = val.toAst();
        }
      });

      args[key] = values;
      return this;
    },

    removeArgument(key) {
      delete args[key];
      return this;
    },

    toAst() {
      const ast: ExpressionAstFunction['arguments'] = {};
      return {
        type: 'function',
        function: fnName,
        arguments: Object.entries(args).reduce((acc, [key, values]) => {
          acc[key] = values.map(val => {
            return isExpressionBuilder(val) ? val.toAst() : val;
          });
          return acc;
        }, ast),
      };
    },

    toString() {
      return format({ type: 'expression', chain: [this.toAst()] }, 'expression');
    },
  };
}
