/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

type NumberOrArray = number | number[];

const findClamp = (a: number, min: number, max: number): number => {
  if (min > max) throw new Error('Min must be less than max');
  return Math.min(Math.max(a, min), max);
};

/**
 * Restricts value to a given range and returns closed available value. If only min is provided, values are restricted to only a lower bound.
 * @param {...(number|number[])} a one or more numbers or arrays of numbers
 * @param {(number|number[])} min The minimum value this function will return.
 * @param {(number|number[])} max The maximum value this function will return.
 * @return {(number|number[])} The closest value between `min` (inclusive) and `max` (inclusive). Returns an array with values greater than or equal to `min` and less than or equal to `max` (if provided) at each index.
 * @throws `'Array length mismatch'` if `a`, `min`, and/or `max` are arrays of different lengths
 * @throws `'Min must be less than max'` if `max` is less than `min`
 * @throws `'Missing minimum value. You may want to use the 'max' function instead'` if min is not provided
 * @throws `'Missing maximum value. You may want to use the 'min' function instead'` if max is not provided
 *
 * @example
 * clamp(1, 2, 3) // returns 2
 * clamp([10, 20, 30, 40], 15, 25) // returns [15, 20, 25, 25]
 * clamp(10, [15, 2, 4, 20], 25) // returns [15, 10, 10, 20]
 * clamp(35, 10, [20, 30, 40, 50]) // returns [20, 30, 35, 35]
 * clamp([1, 9], 3, [4, 5]) // returns [clamp([1, 3, 4]), clamp([9, 3, 5])] = [3, 5]
 */

export function clamp(
  a: NumberOrArray,
  min: NumberOrArray | null,
  max: NumberOrArray | null
): NumberOrArray {
  if (max === null) {
    throw new Error("Missing maximum value. You may want to use the 'min' function instead");
  }
  if (min === null) {
    throw new Error("Missing minimum value. You may want to use the 'max' function instead");
  }

  if (Array.isArray(a)) {
    if (Array.isArray(min)) {
      if (Array.isArray(max)) {
        // a: array, min: array, max: array
        if (a.length !== min.length || a.length !== max.length) {
          throw new Error('Array length mismatch');
        }
        return a.map((val, i) => findClamp(val, min[i], max[i]));
      }
      // a: array, min: array, max: number
      if (a.length !== min.length) {
        throw new Error('Array length mismatch');
      }
      return a.map((val, i) => findClamp(val, min[i], max));
    }
    // min is narrowed to number
    if (Array.isArray(max)) {
      // a: array, min: number, max: array
      if (a.length !== max.length) {
        throw new Error('Array length mismatch');
      }
      return a.map((val, i) => findClamp(val, min, max[i]));
    }
    // a: array, min: number, max: number
    return a.map((val) => findClamp(val, min, max));
  }

  // a is narrowed to number
  if (Array.isArray(min)) {
    if (Array.isArray(max)) {
      // a: number, min: array, max: array
      if (min.length !== max.length) {
        throw new Error('Array length mismatch');
      }
      return min.map((minVal, i) => findClamp(a, minVal, max[i]));
    }
    // a: number, min: array, max: number
    return min.map((minVal) => findClamp(a, minVal, max));
  }

  // min is narrowed to number
  if (Array.isArray(max)) {
    // a: number, min: number, max: array
    return max.map((maxVal) => findClamp(a, min, maxVal));
  }

  // a: number, min: number, max: number
  return findClamp(a, min, max);
}
