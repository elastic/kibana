/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const findClamp = (a, min, max) => {
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

module.exports = { clamp };

function clamp(a, min, max) {
  if (max === null)
    throw new Error("Missing maximum value. You may want to use the 'min' function instead");
  if (min === null)
    throw new Error("Missing minimum value. You may want to use the 'max' function instead");

  if (Array.isArray(max)) {
    if (Array.isArray(a) && Array.isArray(min)) {
      if (a.length !== max.length || a.length !== min.length)
        throw new Error('Array length mismatch');
      return max.map((max, i) => findClamp(a[i], min[i], max));
    }

    if (Array.isArray(a)) {
      if (a.length !== max.length) throw new Error('Array length mismatch');
      return max.map((max, i) => findClamp(a[i], min, max));
    }

    if (Array.isArray(min)) {
      if (min.length !== max.length) throw new Error('Array length mismatch');
      return max.map((max, i) => findClamp(a, min[i], max));
    }

    return max.map((max) => findClamp(a, min, max));
  }

  if (Array.isArray(a) && Array.isArray(min)) {
    if (a.length !== min.length) throw new Error('Array length mismatch');
    return a.map((a, i) => findClamp(a, min[i]));
  }

  if (Array.isArray(a)) {
    return a.map((a) => findClamp(a, min, max));
  }

  if (Array.isArray(min)) {
    return min.map((min) => findClamp(a, min, max));
  }

  return findClamp(a, min, max);
}
