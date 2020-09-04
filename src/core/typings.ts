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

declare module 'query-string' {
  type ArrayFormat = 'bracket' | 'index' | 'none';

  export interface ParseOptions {
    arrayFormat?: ArrayFormat;
    sort: ((itemLeft: string, itemRight: string) => number) | false;
  }

  export interface ParsedQuery<T = string> {
    [key: string]: T | T[] | null | undefined;
  }

  export function parse(str: string, options?: ParseOptions): ParsedQuery;

  export function parseUrl(str: string, options?: ParseOptions): { url: string; query: any };

  export interface StringifyOptions {
    strict?: boolean;
    encode?: boolean;
    arrayFormat?: ArrayFormat;
    sort: ((itemLeft: string, itemRight: string) => number) | false;
  }

  export function stringify(obj: object, options?: StringifyOptions): string;

  export function extract(str: string): string;
}

type DeeplyMockedKeys<T> = {
  [P in keyof T]: T[P] extends (...args: any[]) => any
    ? jest.MockInstance<ReturnType<T[P]>, Parameters<T[P]>>
    : DeeplyMockedKeys<T[P]>;
} &
  T;

type MockedKeys<T> = { [P in keyof T]: jest.Mocked<T[P]> };
