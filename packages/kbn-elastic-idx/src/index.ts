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
 * DeepRequiredArray
 * Nested array condition handler
 */
// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface DeepRequiredArray<T> extends Array<DeepRequired<T>> {}

/**
 * DeepRequiredObject
 * Nested object condition handler
 */
type DeepRequiredObject<T> = { [P in keyof T]-?: DeepRequired<T[P]> };

/**
 * Function that has deeply required return type
 */
type FunctionWithRequiredReturnType<T extends (...args: any[]) => any> = T extends (
  ...args: infer A
) => infer R
  ? (...args: A) => DeepRequired<R>
  : never;

/**
 * DeepRequired
 * Required that works for deeply nested structure
 */
type DeepRequired<T> = NonNullable<T> extends never
  ? T
  : T extends any[]
  ? DeepRequiredArray<T[number]>
  : T extends (...args: any[]) => any
  ? FunctionWithRequiredReturnType<T>
  : NonNullable<T> extends object
  ? DeepRequiredObject<NonNullable<T>>
  : T;

export function idx<T1, T2>(
  input: T1,
  accessor: (input: NonNullable<DeepRequired<T1>>) => T2
): T2 | undefined {
  try {
    return accessor(input as NonNullable<DeepRequired<T1>>);
  } catch (error) {
    return undefined;
  }
}
