/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * Performs a greater than comparison between two values.
 * @param {number|number[]} a a number or an array of numbers
 * @param {number|number[]} b a number or an array of numbers
 * @return {boolean} Returns true if `a` is greater than `b`, false otherwise.  Returns an array with the greater than comparison of each element if `a` is an array.
 * @throws `'Missing b value'` if `b` is not provided
 * @throws `'Array length mismatch'` if `args` contains arrays of different lengths
 * @example
 * gt(1, 1) // returns false
 * gt(2, 1) // returns true
 * gt([1, 2], 1) // returns [true, false]
 * gt([1, 2], [2, 1]) // returns [false, true]
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
