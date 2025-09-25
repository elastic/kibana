/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

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
  // Do not extract key logic or will break VSCode prop definition linking
  {
    [K in keyof T as undefined extends T[K] ? K : never]?: T[K];
  } & {
    [K in keyof T as undefined extends T[K] ? never : K]: T[K];
  }
>;

/**
 * Simplifies complex object types
 */
export type Simplify<T extends object> = { [k in keyof T]: T[k] } & {};
