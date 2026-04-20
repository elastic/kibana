/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { get } from './get';

/**
 * Like {@link get}, but returns `T | undefined` instead of `T`, accounting for
 * the possibility that the key may not exist in the object.
 * This is useful as a type-safe alternative to calling object[key] in types that are defined
 * as something like: { [key: string]: Type }. Because Kibana does not use noUncheckedIndexedAccess
 * in its tsconfig, calls to object[key] for this kind of type will never account for the possibility
 * of `key` not existing in `object`.
 */
export function getSafe<
  CFG extends { [k: string]: any },
  A extends keyof CFG,
  B extends keyof CFG[A],
  C extends keyof CFG[A][B],
  D extends keyof CFG[A][B][C],
  E extends keyof CFG[A][B][C][D]
>(obj: CFG, path: [A, B, C, D, E]): CFG[A][B][C][D][E] | undefined;
export function getSafe<
  CFG extends { [k: string]: any },
  A extends keyof CFG,
  B extends keyof CFG[A],
  C extends keyof CFG[A][B],
  D extends keyof CFG[A][B][C]
>(obj: CFG, path: [A, B, C, D]): CFG[A][B][C][D] | undefined;
export function getSafe<
  CFG extends { [k: string]: any },
  A extends keyof CFG,
  B extends keyof CFG[A],
  C extends keyof CFG[A][B]
>(obj: CFG, path: [A, B, C]): CFG[A][B][C] | undefined;
export function getSafe<
  CFG extends { [k: string]: any },
  A extends keyof CFG,
  B extends keyof CFG[A]
>(obj: CFG, path: [A, B]): CFG[A][B] | undefined;
export function getSafe<CFG extends { [k: string]: any }, A extends keyof CFG>(
  obj: CFG,
  path: [A] | A
): CFG[A] | undefined;
export function getSafe<CFG extends { [k: string]: any }>(
  obj: CFG,
  path: string[] | string
): unknown {
  const result = get(obj, path as string);
  if (typeof result !== 'undefined') return result;
  return undefined;
}
