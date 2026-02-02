/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Recursively transform a type so that each value can be either its original type or a string.
 * This is useful for types that may contain template strings (like Liquid templates) that will
 * be rendered at runtime.
 *
 * @example
 * type Input = { name: string; age: number; items: Array<{ id: number }> };
 * type RawInput = OrStringRecursive<Input>;
 * // Result: { name: string; age: number | string; items: Array<{ id: number | string }> | string }
 */
export type OrStringRecursive<T> = T extends Array<infer U>
  ? Array<OrStringRecursive<U>> | string
  : T extends object
  ? { [K in keyof T]: OrStringRecursive<T[K]> }
  : T | string;
