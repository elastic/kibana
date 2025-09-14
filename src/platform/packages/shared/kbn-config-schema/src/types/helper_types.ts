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
 * Check if `T` is of type `any`.
 *
 * This uses the fact that `any` will absorb all types.
 *
 * For example:
 * - If `T` is `any`, `1 & any` resolves to `any`, and `0 extends any` is `true` (since `any` accepts any type).
 * - If `T` is not `any` (e.g. `string`, `number`, `{}`), `1 & T` is `never` (because `1` is a literal type that can't intersect with most types), so `0 extends never` is `false`.
 */
export type IsAny<T> = 0 extends 1 & T ? true : false;
