/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Checks whether one value is less than or equal to another. If either argument is an array, the function returns `true` only if every element satisfies the comparison.
 * @param {number|number[]} a a number or an array of numbers
 * @param {number|number[]} b a number or an array of numbers
 * @return {boolean} `true` if `a` is less than or equal to `b`, `false` otherwise. If `a` or `b` is an array, returns `true` only if every element satisfies the comparison.
 * @throws `'Missing b value'` if `b` is not provided
 * @throws `'Array length mismatch'` if `a` and `b` are arrays of different lengths
 * @example
 * lte(1, 1) // returns true
 * lte(1, 2) // returns true
 * lte([1, 2], 2) // returns true
 * lte([1, 2], [1, 1]) // returns false
 * lte(1, [1, 2]) // returns true
 */

function lte(a, b) {
  if (b == null) {
    throw new Error('Missing b value');
  }
  if (Array.isArray(a)) {
    if (!Array.isArray(b)) {
      return a.every((v) => v <= b);
    }
    if (a.length !== b.length) {
      throw new Error('Array length mismatch');
    }
    return a.every((v, i) => v <= b[i]);
  }
  if (Array.isArray(b)) {
    return b.every((v) => a <= v);
  }
  return a <= b;
}
module.exports = { lte };
