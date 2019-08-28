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

type Freezable = { [k: string]: any } | any[];

// if we define this inside RecursiveReadonly TypeScript complains
// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface RecursiveReadonlyArray<T> extends Array<RecursiveReadonly<T>> {}

/** @public */
export type RecursiveReadonly<T> = T extends (...args: any[]) => any
  ? T
  : T extends any[]
  ? RecursiveReadonlyArray<T[number]>
  : T extends object
  ? Readonly<{ [K in keyof T]: RecursiveReadonly<T[K]> }>
  : T;

export function deepFreeze<T extends Freezable>(object: T) {
  // for any properties that reference an object, makes sure that object is
  // recursively frozen as well
  for (const value of Object.values(object)) {
    if (value !== null && typeof value === 'object') {
      deepFreeze(value);
    }
  }

  return Object.freeze(object) as RecursiveReadonly<T>;
}
