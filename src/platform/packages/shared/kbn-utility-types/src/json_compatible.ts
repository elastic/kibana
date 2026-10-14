/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

type JsonPrimitive = string | number | boolean | null;

/** Array items: `undefined` becomes `null` in JSON, so it is rejected rather than passed through. */
type JsonCompatibleItem<TItem> = TItem extends undefined ? never : JsonCompatibleValue<TItem>;

/**
 * Checks one property value: primitives and `undefined` (the property is dropped by
 * `JSON.stringify`) pass through, functions, `bigint` and `symbol` become `never`,
 * arrays and objects are checked recursively.
 */
type JsonCompatibleValue<TValue> = TValue extends JsonPrimitive | undefined
  ? TValue
  : TValue extends (...args: never[]) => unknown
  ? never
  : TValue extends ReadonlyArray<infer TItem>
  ? ReadonlyArray<JsonCompatibleItem<TItem>>
  : TValue extends object
  ? JsonCompatibleObject<TValue>
  : never;

type JsonCompatibleObject<TObject> = {
  [TKey in keyof TObject]: JsonCompatibleValue<TObject[TKey]>;
};

/**
 * Maps `T` onto itself when every reachable value survives `JSON.parse(JSON.stringify(value))`
 * unchanged, and onto a type with `never` members otherwise. Meant as an F-bounded constraint,
 * `<T extends JsonCompatible<T>>`, which unlike `JsonObject` accepts `interface` declarations
 * and optional properties.
 *
 * Rejected: `Date`, `Map`, `Set`, functions, `bigint`, `symbol`, objects with methods,
 * `undefined` array items, and non-object top-level values.
 * Not detectable structurally: class instances with only data fields (delivered as plain
 * objects) and top-level function types.
 */
export type JsonCompatible<T> = object & JsonCompatibleObject<T>;
