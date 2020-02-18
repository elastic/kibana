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
export { $Values, Required, Optional, Class } from 'utility-types';

/**
 * A type that may or may not be a `Promise`.
 */
export type MaybePromise<T> = T | Promise<T>;

/**
 * Converts a type to a `Promise`, unless it is already a `Promise`. Useful when proxying the return value of a possibly async function.
 */
export type ShallowPromise<T> = T extends Promise<infer U> ? Promise<U> : Promise<T>;

/**
 * Returns wrapped type of a `Promise`.
 */
export type UnwrapPromise<T extends Promise<any>> = PromiseType<T>;

/**
 * Returns wrapped type of a promise, or returns type as is, if it is not a promise.
 */
export type UnwrapPromiseOrReturn<T> = T extends Promise<infer U> ? U : T;

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

/**
 * Returns types or array or object values.
 */
export type Values<T> = T extends any[] ? T[number] : T extends object ? T[keyof T] : never;

/**
 * Utility type for converting a union of types into an intersection.
 *
 * This is a bit of "black magic" that will interpret a Union type as an Intersection
 * type.  This is necessary in the case of distinguishing one collection from
 * another.
 */
export type UnionToIntersection<U> = (U extends any
? (k: U) => void
: never) extends (k: infer I) => void
  ? I
  : never;

/**
 * Returns public keys of an object.
 */
export type PublicKeys<T> = keyof T;

/**
 * Returns an object with public keys only.
 */
export type PublicContract<T> = Pick<T, PublicKeys<T>>;
