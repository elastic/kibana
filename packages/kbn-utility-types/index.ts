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

import { PromiseType } from 'utility-types';

/**
 * Returns wrapped type of a promise.
 */
export type UnwrapPromise<T extends Promise<any>> = PromiseType<T>;

/**
 * Minimal interface for an object resembling an `Observable`.
 */
export interface ObservableLike<T> {
  subscribe(observer: (value: T) => void): void;
}

/**
 * Returns wrapped type of an observable.
 */
export type UnwrapObservable<T extends ObservableLike<any>> = T extends ObservableLike<infer U>
  ? U
  : never;

/**
 * Converts a type to a `Promise`, unless it is already a `Promise`. Useful when proxying the return value of a possibly async function.
 */
export type ShallowPromise<T> = T extends Promise<infer U> ? Promise<U> : Promise<T>;

/**
 * Ensures T is of type X.
 */
export type Ensure<T, X> = T extends X ? T : never;

// If we define this inside RecursiveReadonly TypeScript complains.
// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface RecursiveReadonlyArray<T> extends Array<RecursiveReadonly<T>> {}
export type RecursiveReadonly<T> = T extends (...args: any) => any
  ? T
  : T extends any[]
  ? RecursiveReadonlyArray<T[number]>
  : T extends object
  ? Readonly<{ [K in keyof T]: RecursiveReadonly<T[K]> }>
  : T;
