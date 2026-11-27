/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Checks whether two values are equal. For arrays, the function returns `true` only if every element is equal.
 * @param {number|number[]} a a number or an array of numbers
 * @param {number|number[]} b a number, or, if `a` is also an array, an array of numbers with the same length as `a`
 * @return {boolean} `true` if `a` and `b` are equal, `false` otherwise. If `a` is an array, returns `true` only if every element of `a` equals `b`, or equals the element at the same index of `b` if `b` is an array.
 * @throws `'Missing b value'` if `b` is not provided
 * @throws `'Array length mismatch'` if `a` and `b` are arrays of different lengths
 * @example
 * eq(1, 1) // returns true
 * eq(1, 2) // returns false
 * eq([1, 1], 1) // returns true
 * eq([1, 2], 1) // returns false
 * eq([1, 2], [1, 2]) // returns true
 */

function eq(a, b) {
  if (b == null) {
    throw new Error('Missing b value');
  }
  if (Array.isArray(a)) {
    if (!Array.isArray(b)) {
      return a.every((v) => v === b);
    }
    if (a.length !== b.length) {
      throw new Error('Array length mismatch');
    }
    return a.every((v, i) => v === b[i]);
  }

  return a === b;
}
module.exports = { eq };
