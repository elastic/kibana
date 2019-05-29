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

/**
 * A generic type which represents an Expression Function definition.
 */
export interface ExpressionFunction<Name extends string, Context, Arguments, Return> {
  /** Arguments for the Function */
  args: { [key in keyof Arguments]: ArgumentType<Arguments[key]> };
  aliases?: string[];
  context?: {
    types: Array<TypeToString<Context>>;
  };
  /** Help text displayed in the Expression editor */
  help: string;
  /** The name of the Function */
  name: Name;
  /** The type of the Function */
  type?: TypeToString<UnwrapPromise<Return>>;
  /** The implementation of the Function */
  fn(context: Context, args: Arguments, handlers: FunctionHandlers): Return;
}

// TODO: Handlers can be passed to the `fn` property of the Function.  At the moment, these Functions
// are not strongly defined.
interface FunctionHandlers {
  [key: string]: (...args: any) => any;
}
