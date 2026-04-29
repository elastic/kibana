/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Given a record type `{a: X; b: Y}`, produces a distributed union:
 * `{ type: "a"; value: X } | { type: "b"; value: Y }`.
 */
export type FromExternalVariant<T extends Record<string, unknown>> = T extends any
  ? {
      [K in keyof T]: { type: K; value: T[K] };
    }[keyof T]
  : never;

export function fromExternalVariant<T extends Record<string, unknown>>(
  obj: T
): FromExternalVariant<T> {
  const keys = Object.keys(obj);

  if (keys.length !== 1) {
    throw new Error(`Expected one (1) key in object, found: ${keys.length}`);
  }

  const key = keys[0] as keyof T;

  return {
    type: key,
    value: obj[key],
  } as FromExternalVariant<T>;
}
