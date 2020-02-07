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

/* eslint-disable max-classes-per-file */

import {
  ArgumentType,
  ExpressionValue,
  AnyExpressionFunction,
  FunctionHandlers,
} from '../../common/types';
import { Registry } from './registry';

export class FunctionParameter {
  name: string;
  required: boolean;
  help: string;
  types: string[];
  default: any;
  aliases: string[];
  multi: boolean;
  resolve: boolean;
  options: any[];

  constructor(name: string, arg: ArgumentType<any>) {
    const { required, help, types, aliases, multi, resolve, options } = arg;

    if (name === '_') {
      throw Error('Arg names must not be _. Use it in aliases instead.');
    }

    this.name = name;
    this.required = !!required;
    this.help = help || '';
    this.types = types || [];
    this.default = arg.default;
    this.aliases = aliases || [];
    this.multi = !!multi;
    this.resolve = resolve == null ? true : resolve;
    this.options = options || [];
  }

  accepts(type: string) {
    if (!this.types.length) return true;
    return this.types.indexOf(type) > -1;
  }
}

export class Function {
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
  fn: (
    input: ExpressionValue,
    params: Record<string, any>,
    handlers: FunctionHandlers
  ) => ExpressionValue;

  /**
   * A short help text.
   */
  help: string;

  args: Record<string, FunctionParameter> = {};

  context: { types?: string[] };

  constructor(functionDefinition: AnyExpressionFunction) {
    const { name, type, aliases, fn, help, args, context } = functionDefinition;

    this.name = name;
    this.type = type;
    this.aliases = aliases || [];
    this.fn = (input, params, handlers) => Promise.resolve(fn(input, params, handlers));
    this.help = help || '';
    this.context = context || {};

    for (const [key, arg] of Object.entries(args || {})) {
      this.args[key] = new FunctionParameter(key, arg);
    }
  }

  accepts = (type: string): boolean => {
    // If you don't tell us about context, we'll assume you don't care what you get.
    if (!this.context.types) return true;
    return this.context.types.indexOf(type) > -1;
  };
}

export class FunctionsRegistry extends Registry<Function> {
  register(functionDefinition: AnyExpressionFunction | (() => AnyExpressionFunction)) {
    const fn = new Function(
      typeof functionDefinition === 'object' ? functionDefinition : functionDefinition()
    );
    this.set(fn.name, fn);
  }
}
