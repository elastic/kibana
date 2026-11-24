/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Checks whether one value is greater than another. For arrays, the function returns `true` only if every element is greater.
 * @param {number|number[]} a a number or an array of numbers
 * @param {number|number[]} b a number, or, if `a` is also an array, an array of numbers with the same length as `a`
 * @return {boolean} `true` if `a` is greater than `b`, `false` otherwise. If `a` is an array, returns `true` only if every element of `a` is greater than `b`, or greater than the element at the same index of `b` if `b` is an array.
 * @throws `'Missing b value'` if `b` is not provided
 * @throws `'Array length mismatch'` if `a` and `b` are arrays of different lengths
 * @example
 * gt(1, 1) // returns false
 * gt(2, 1) // returns true
 * gt([2, 3], 1) // returns true
 * gt([1, 2], 1) // returns false
 * gt([1, 2], [0, 1]) // returns true
 */

function gt(a, b) {
  if (b == null) {
    throw new Error('Missing b value');
  }
  if (Array.isArray(a)) {
    if (!Array.isArray(b)) {
      return a.every((v) => v > b);
    }
    if (a.length !== b.length) {
      throw new Error('Array length mismatch');
    }
    return a.every((v, i) => v > b[i]);
  }

  return a > b;
}
module.exports = { gt };
