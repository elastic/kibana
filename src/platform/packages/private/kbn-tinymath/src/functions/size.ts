/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

type AnyOrArray = any | any[];

/**
 * Returns the length of an array. Alias for count
 * @param {any[]} a array of any values
 * @return {(number)} The length of the array. Returns 1 if `a` is not an array.
 * @throws `'Must pass an array'` if `a` is not an array
 * @example
 * size([]) // returns 0
 * size([-1, -2, -3, -4]) // returns 4
 * size(100) // returns 1
 */

export function size(a: AnyOrArray): number {
  if (Array.isArray(a)) return a.length;
  throw new Error('Must pass an array');
}

(size as any).skipNumberValidation = true;
