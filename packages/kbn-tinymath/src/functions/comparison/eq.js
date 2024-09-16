/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Performs an equality comparison between two values.
 * @param {number|number[]} a a number or an array of numbers
 * @param {number|number[]} b a number or an array of numbers
 * @return {boolean} Returns true if `a` and `b` are equal, false otherwise.  Returns an array with the equality comparison of each element if `a` is an array.
 * @throws `'Missing b value'` if `b` is not provided
 * @throws `'Array length mismatch'` if `args` contains arrays of different lengths
 * @example
 * eq(1, 1) // returns true
 * eq(1, 2) // returns false
 * eq([1, 2], 1) // returns [true, false]
 * eq([1, 2], [1, 2]) // returns [true, true]
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
