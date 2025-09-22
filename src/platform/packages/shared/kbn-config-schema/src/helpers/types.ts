/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export type OptionalKeys<T extends object> = {
  [k in keyof T]: undefined extends T[k] ? k : never;
}[keyof T];

export type RequiredKeys<T extends object> = {
  [k in keyof T]: undefined extends T[k] ? never : k;
}[keyof T];

/**
 * Makes all `undefined` values optional.
 *
 * Otherwise, explicitly passing `undefined` will throw a type error.
 *
 * @example
 * ```ts
 * type A = OptionalizeObject<{
 *   a: string;
 *   b: number | undefined;
 * }>;
 * // A -> { a: string; b?: number | undefined }
 * ```
 */
export type OptionalizeObject<T extends object> = Simplify<
  {
    [K in RequiredKeys<T>]: T[K];
  } & {
    [K in OptionalKeys<T>]?: T[K];
  }
>;

/**
 * Simplifies complex object types
 */
export type Simplify<T extends object> = { [k in keyof T]: T[k] } & {};
