/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

/**
 * Retrieve the value for the specified path
 *
 * Note that dot is _not_ allowed to specify a deeper key, it will assume that
 * the dot is part of the key itself.
 */
export function get<
  CFG extends { [k: string]: any },
  A extends keyof CFG,
  B extends keyof CFG[A],
  C extends keyof CFG[A][B],
  D extends keyof CFG[A][B][C],
  E extends keyof CFG[A][B][C][D]
>(obj: CFG, path: [A, B, C, D, E]): CFG[A][B][C][D][E];
export function get<
  CFG extends { [k: string]: any },
  A extends keyof CFG,
  B extends keyof CFG[A],
  C extends keyof CFG[A][B],
  D extends keyof CFG[A][B][C]
>(obj: CFG, path: [A, B, C, D]): CFG[A][B][C][D];
export function get<
  CFG extends { [k: string]: any },
  A extends keyof CFG,
  B extends keyof CFG[A],
  C extends keyof CFG[A][B]
>(obj: CFG, path: [A, B, C]): CFG[A][B][C];
export function get<CFG extends { [k: string]: any }, A extends keyof CFG, B extends keyof CFG[A]>(
  obj: CFG,
  path: [A, B]
): CFG[A][B];
export function get<CFG extends { [k: string]: any }, A extends keyof CFG>(
  obj: CFG,
  path: [A] | A
): CFG[A];
export function get<CFG extends { [k: string]: any }>(obj: CFG, path: string[] | string): any {
  if (typeof path === 'string') {
    if (path.includes('.')) {
      throw new Error('Using dots in `get` with a string is not allowed, use array instead');
    }

    return obj[path];
  }

  for (const key of path) {
    obj = obj[key];
  }

  return obj;
}
