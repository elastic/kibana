/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * Remainder after dividing two numbers. If at least one array of numbers is passed into the function, the function will be applied index-wise to each element.
 * @param {(number|number[])} a dividend, a number or an array of numbers
 * @param {(number|number[])} b divisor, a number or an array of numbers, `b` != 0
 * @return {(number|number[])} The remainder of `a` divided by `b` if both are numbers. Returns an array with the the remainders applied index-wise to each element if `a` or `b` is an array.
 * @throws `'Array length mismatch'` if `a` and `b` are arrays with different lengths
 * - `'Cannot divide by 0'` if `b` equals 0 or contains 0
 * @example
 * mod(10, 7) // returns 3
 * mod([11, 22, 33, 44], 10) // returns [1, 2, 3, 4]
 * mod(100, [3, 7, 11, 23]) // returns [1, 2, 1, 8]
 * mod([14, 42, 65, 108], [5, 4, 14, 2]) // returns [5, 2, 9, 0]
 */

module.exports = { mod };

function mod(a, b) {
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) throw new Error('Array length mismatch');
    return a.map((val, i) => {
      if (b[i] === 0) throw new Error('Cannot divide by 0');
      return val % b[i];
    });
  }
  if (Array.isArray(b)) return b.map((b) => a % b);
  if (b === 0) throw new Error('Cannot divide by 0');
  if (Array.isArray(a)) return a.map((a) => a % b);
  return a % b;
}
