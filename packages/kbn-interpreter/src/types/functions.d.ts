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

export type FunctionRegistration<
  Input,
  Output,
  Args extends { [argName: string]: ValidTsArgumentTypes }
> = () => FunctionDefinition<Input, Output, Args>;

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
