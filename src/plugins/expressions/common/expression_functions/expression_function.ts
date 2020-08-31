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

import { AnyExpressionFunctionDefinition } from './types';
import { ExpressionFunctionParameter } from './expression_function_parameter';
import { ExpressionValue } from '../expression_types/types';
import { ExecutionContext } from '../execution';

export class ExpressionFunction {
  /**
   * Name of function
   */
  name: string;

  /**
   * Aliases that can be used instead of `name`.
   */
  aliases: string[];

  /**
   * Return type of function. This SHOULD be supplied. We use it for UI
   * and autocomplete hinting. We may also use it for optimizations in
   * the future.
   */
  type: string;

  /**
   * Function to run function (context, args)
   */
  fn: (input: ExpressionValue, params: Record<string, any>, handlers: object) => ExpressionValue;

  /**
   * A short help text.
   */
  help: string;

  /**
   * Specification of expression function parameters.
   */
  args: Record<string, ExpressionFunctionParameter> = {};

  /**
   * Type of inputs that this function supports.
   */
  inputTypes: string[] | undefined;

  constructor(functionDefinition: AnyExpressionFunctionDefinition) {
    const { name, type, aliases, fn, help, args, inputTypes, context } = functionDefinition;

    this.name = name;
    this.type = type;
    this.aliases = aliases || [];
    this.fn = (input, params, handlers) =>
      Promise.resolve(fn(input, params, handlers as ExecutionContext));
    this.help = help || '';
    this.inputTypes = inputTypes || context?.types;

    for (const [key, arg] of Object.entries(args || {})) {
      this.args[key] = new ExpressionFunctionParameter(key, arg);
    }
  }

  accepts = (type: string): boolean => {
    // If you don't tell us input types, we'll assume you don't care what you get.
    if (!this.inputTypes) return true;
    return this.inputTypes.indexOf(type) > -1;
  };
}
