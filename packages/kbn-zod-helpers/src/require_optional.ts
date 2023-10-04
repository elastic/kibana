/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * Make any optional fields required, but add `| undefined` to their type.
 *
 * For example:
 * type A = RequiredOptional<{ a?: string; b: number }>;
 *
 * will yield a type of:
 * type A = { a: string | undefined; b: number; }
 */
export type RequiredOptional<T> = { [K in keyof T]-?: [T[K]] } extends infer U
  ? U extends Record<keyof U, [unknown]>
    ? { [K in keyof U]: U[K][0] }
    : never
  : never;

/**
 * This helper designed to be used with `z.transform` to make all optional fields required.
 *
 * @param schema Zod schema
 * @returns The same schema but with all optional fields required.
 */
export const requireOptional = <T>(schema: T) => schema as RequiredOptional<T>;
