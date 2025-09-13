/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Simplifies complex object types
 */
export type Simplify<T extends object> = { [KeyType in keyof T]: T[KeyType] } & {};

/**
 * Merges keys with different types
 *
 * @example
 * ```ts
 * type T1 = Type<number, never>;
 * type T2 = Type<string, string>;
 *
 * type MergedT = IntersectionMergedType<T1, T2>; // Type<number | string, string>
 * ```
 */
export type IntersectedUnion<T extends any[]> = Intersection<T> & Union<T>;

/**
 * Helper type to compute the union of all types in a tuple
 */
export type Union<T extends any[]> = T extends [infer First, ...infer Rest]
  ? First | Union<Rest>
  : {};

/**
 * Helper type to compute the intersection of all types in a tuple
 */
export type Intersection<T extends any[]> = T extends [infer First, ...infer Rest]
  ? Rest extends any[]
    ? First & Intersection<Rest>
    : First
  : {};
