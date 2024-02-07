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
 * This bit of logic is to force all fields to be accounted for in conversions
 * from the internal rule schema to the response schema. Rather than use
 * partial, which makes each field optional, we make each field required but
 * possibly undefined. The result is that if a field is forgotten in the
 * conversion from internal schema to response schema TS will report an error.
 * If we just used partial instead, then optional fields can be accidentally
 * omitted from the conversion - and any actual values in those fields
 * internally will be stripped in the response.
 *
 * @example
 * type A = RequiredOptional<{ a?: string; b: number }>;
 * will yield a type of: type A = { a: string | undefined; b: number; }
 *
 * @note
 * We should consider removing this logic altogether from our schemas and use it
 * in place with converters whenever needed.
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
export const requiredOptional = <T>(schema: T) => schema as RequiredOptional<T>;
