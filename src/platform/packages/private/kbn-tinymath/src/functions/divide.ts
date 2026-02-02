/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

type NumberOrArray = number | number[];

/**
 * Divides two numbers. If at least one array of numbers is passed into the function, the function will be applied index-wise to each element.
 * @param {(number|number[])} a dividend, a number or an array of numbers
 * @param {(number|number[])} b divisor, a number or an array of numbers, `b` != 0
 * @return {(number|number[])} The quotient of `a` and `b` if both are numbers. Returns an array with the quotients applied index-wise to each element if `a` or `b` is an array.
 * @throws `'Array length mismatch'` if `a` and `b` are arrays with different lengths
 * - `'Cannot divide by 0'` if `b` equals 0 or contains 0
 * @example
 * divide(6, 3) // returns 2
 * divide([10, 20, 30, 40], 10) // returns [1, 2, 3, 4]
 * divide(10, [1, 2, 5, 10]) // returns [10, 5, 2, 1]
 * divide([14, 42, 65, 108], [2, 7, 5, 12]) // returns [7, 6, 13, 9]
 */

export function divide(a: NumberOrArray, b: NumberOrArray): NumberOrArray {
  if (Array.isArray(a)) {
    if (Array.isArray(b)) {
      if (a.length !== b.length) throw new Error('Array length mismatch');
      return a.map((val, i) => {
        if (b[i] === 0) throw new Error('Cannot divide by 0');
        return val / b[i];
      });
    }
    // b is narrowed to number
    if (b === 0) throw new Error('Cannot divide by 0');
    return a.map((val) => val / b);
  }
  // a is narrowed to number
  if (Array.isArray(b)) {
    return b.map((val) => {
      if (val === 0) throw new Error('Cannot divide by 0');
      return a / val;
    });
  }
  // both a and b are narrowed to number
  if (b === 0) throw new Error('Cannot divide by 0');
  return a / b;
}
