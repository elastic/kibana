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

/**
 * This file provides typings for function definitions that can be registered
 * to the interpreter. Check the {@link FunctionDefinition} documentation
 * for details how to use this.
 */

type ArgumentTypes = 'string' | 'number' | 'boolean' | 'null';
type NonMultiArgumentTypes = string | number | boolean | null;
type MultiArgumentTypes = string[] | number[] | boolean[] | null;
type ValidTsArgumentTypes = NonMultiArgumentTypes | MultiArgumentTypes;

interface BaseArgumentDefinition<T> {
  types: Array<
    T extends string | string[]
      ? 'string'
      : T extends number | number[]
      ? 'number'
      : T extends boolean | boolean[]
      ? 'boolean'
      : T extends null
      ? 'null'
      : never
  >;
  default?: T extends any[] ? T[number] : T;
  aliases?: string[];
  help?: string;
}

interface ArgumentDefinition<T> extends BaseArgumentDefinition<T> {
  multi?: false;
}

interface MultiArgumentDefinition<T> extends BaseArgumentDefinition<T> {
  multi: true;
}

/**
 * The interface that must be fulfilled by the function definition of an
 * interpreter function.
 *
 * ## Usage
 * Usually you would use this as the return type for the exported function,
 * that register with the interpreter:
 *
 * ```ts
 * export const textFunction = (): FunctionDefinition<any, any, any> => ({ ... });
 * ```
 *
 * ## Generic types
 * The three generic types represent the input, output and the arguments of the function.
 *
 * ### Argument type
 * The third type parameter defined the structure of the arguments accepted by the functions
 * and must correlate to the definition of the arguments in the `args` key of the registration.
 *
 * Due to [limitations in TypeScript](https://github.com/Microsoft/TypeScript/issues/15300),
 * you must either specify the parameter inline, or define it as a type, but not as an interface.
 *
 * ```ts
 * // Inline and type will work fine
 * FunctionDefinition<any, any, { name: string }>
 * // tslint:disable-next-line interface-over-type-literal
 * type MyArgs = { name: string };
 * FunctionDefinition<any, any, MyArgs>
 * // Interface WON'T work!
 * interface MyArgs { name: string }
 * FunctionDefinition<any, any, MyArgs>
 * ```
 */
export interface FunctionDefinition<
  Input,
  Output,
  Args extends { [argName: string]: ValidTsArgumentTypes }
> {
  name: string;
  type: string;
  context: {
    types: string[];
  };
  help?: string;
  args: {
    [argName in keyof Args]: Args[argName] extends NonMultiArgumentTypes
      ? ArgumentDefinition<Args[argName]>
      : MultiArgumentDefinition<Args[argName]>
  };
  fn: (context: Input, args: Args) => Output;
}
