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

export interface TimelionFunctionInterface extends TimelionFunctionConfig {
  chainable: boolean;
  originalFn: Function;
  argsByName: TimelionFunctionArgs[];
}

export interface TimelionFunctionConfig {
  name: string;
  help: string;
  extended: boolean;
  aliases: string[];
  fn: Function;
  args: TimelionFunctionArgs[];
}

export interface TimelionFunctionArgs {
  name: string;
  help?: string;
  multi?: boolean;
  types: TimelionFunctionArgsTypes[];
  suggestions?: TimelionFunctionArgsSuggestion[];
}

export type TimelionFunctionArgsTypes = 'seriesList' | 'number' | 'string' | 'boolean' | 'null';

export interface TimelionFunctionArgsSuggestion {
  name: string;
  help: string;
}

// eslint-disable-next-line import/no-default-export
export default class TimelionFunction {
  constructor(name: string, config: TimelionFunctionConfig);
}
