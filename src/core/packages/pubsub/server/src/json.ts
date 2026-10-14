/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

type JsonPrimitive = string | number | boolean | null;

/**
 * Checks one value: primitives and `undefined` (dropped by `JSON.stringify`) pass through,
 * functions, `bigint` and `symbol` become `never`, arrays and objects are checked recursively.
 */
type JsonCompatibleValue<TValue> = TValue extends JsonPrimitive | undefined
  ? TValue
  : TValue extends (...args: never[]) => unknown
  ? never
  : TValue extends ReadonlyArray<infer TItem>
  ? ReadonlyArray<JsonCompatibleValue<TItem>>
  : TValue extends object
  ? JsonCompatible<TValue>
  : never;

/**
 * Maps `TData` onto itself when every reachable value survives `JSON.parse(JSON.stringify(data))`
 * unchanged, and onto `never` members otherwise. Used as an F-bounded constraint
 * (`TData extends JsonCompatible<TData>`) so that topics carrying `Date`, `Map`, `Set`,
 * class instances or functions fail to compile instead of delivering mangled data.
 *
 * @public
 */
export type JsonCompatible<TData> = {
  [TKey in keyof TData]: JsonCompatibleValue<TData[TKey]>;
};
