/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { eq } from './eq';
import { gt } from './gt';

type NumberOrArray = number | number[];

/**
 * Performs a greater than or equal comparison between two values.
 * @param {number|number[]} a a number or an array of numbers
 * @param {number|number[]} b a number or an array of numbers
 * @return {boolean} Returns true if `a` is greater than or equal to `b`, false otherwise.  Returns an array with the greater than or equal comparison of each element if `a` is an array.
 * @throws `'Array length mismatch'` if `args` contains arrays of different lengths
 * @example
 * gte(1, 1) // returns true
 * gte(1, 2) // returns false
 * gte([1, 2], 2) // returns [false, true]
 * gte([1, 2], [1, 1]) // returns [true, true]
 */

export function gte(a: NumberOrArray, b: NumberOrArray | null | undefined): boolean | boolean[] {
  return eq(a, b as NumberOrArray) || gt(a, b as NumberOrArray);
}
