/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export type { $Values, Assign, Class, Optional, Required } from 'utility-types';

export type {
  JsonArray,
  JsonValue,
  JsonObject,
  SerializableRecord,
  Serializable,
} from './src/serializable';

/**
 * A type that may or may not be a `Promise`.
 */
export type MaybePromise<T> = T | Promise<T>;

/**
 * Converts a type to a `Promise`, unless it is already a `Promise`. Useful when proxying the return value of a possibly async function.
 */
export type ShallowPromise<T> = T extends Promise<infer U> ? Promise<U> : Promise<T>;

/**
 * Unwrap all promise attributes of the given type
 */
export type AwaitedProperties<T> = {
  [K in keyof T]: Awaited<T[K]>;
};

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
export interface RecursiveReadonlyArray<T> extends ReadonlyArray<RecursiveReadonly<T>> {}

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
export type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (
  k: infer I
) => void
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

/**
 * Returns public method names
 */
export type MethodKeysOf<T> = {
  [K in keyof T]: T[K] extends (...args: any[]) => any ? K : never;
}[keyof T];

/**
 *  Returns an object with public methods only.
 */
export type PublicMethodsOf<T> = Pick<T, MethodKeysOf<T>>;

/**
 *  Makes an object with readonly properties mutable.
 */
export type Writable<T> = {
  -readonly [K in keyof T]: T[K];
};

/**
 * XOR for some properties applied to a type
 * (XOR is one of these but not both or neither)
 *
 * Usage: OneOf<typeToExtend, one | but | not | multiple | of | these | are | required>
 *
 * To require aria-label or aria-labelledby but not both
 * Example: OneOf<Type, 'aria-label' | 'aria-labelledby'>
 */
export type OneOf<T, K extends keyof T> = Omit<T, K> &
  { [k in K]: Pick<Required<T>, k> & { [k1 in Exclude<K, k>]?: never } }[K];

/**
 * Deep partial version of a type.
 */
export type DeepPartial<T> = T extends any[]
  ? DeepPartialArray<T[number]>
  : T extends object
  ? DeepPartialObject<T>
  : T;

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface DeepPartialArray<T> extends Array<DeepPartial<T>> {}

export type DeepPartialObject<T> = { [P in keyof T]+?: DeepPartial<T[P]> };

export type { DotObject, DedotObject } from './src/dot';

export type ArrayElement<A> = A extends ReadonlyArray<infer T> ? T : never;

/**
 * Takes a type and makes selected properties required.
 *
 * @example
 * interface Foo { bar?: string }
 * const foo: WithRequiredProperty<Foo, 'bar'> = { bar: 'baz' }
 */
export type WithRequiredProperty<Type, Key extends keyof Type> = Omit<Type, Key> & {
  [Property in Key]-?: Type[Property];
};

// Recursive partial object type. inspired by EUI RecursivePartial
export type RecursivePartial<T> = {
  [P in keyof T]?: T[P] extends NonAny[]
    ? T[P]
    : T[P] extends readonly NonAny[]
    ? T[P]
    : T[P] extends Array<infer U>
    ? Array<RecursivePartial<U>>
    : T[P] extends ReadonlyArray<infer U>
    ? ReadonlyArray<RecursivePartial<U>>
    : T[P] extends Set<infer V>
    ? Set<RecursivePartial<V>>
    : T[P] extends Map<infer K, infer V>
    ? Map<K, RecursivePartial<V>>
    : T[P] extends NonAny
    ? T[P]
    : RecursivePartial<T[P]>;
};
type NonAny = number | boolean | string | symbol | null;

export type RemoveIndexSignatures<O> = {
  // copy all attributes from the person interface
  // and remove the index signature
  [K in keyof O as string extends K ? never : number extends K ? never : K]: O[K];
};
