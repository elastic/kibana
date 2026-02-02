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
 * Multiplies two numbers. If at least one array of numbers is passed into the function, the function will be applied index-wise to each element.
 * @param {(number|number[])} a a number or an array of numbers
 * @param {(number|number[])} b a number or an array of numbers
 * @return {(number|number[])} The product of `a` and `b` if both are numbers. Returns an array with the the products applied index-wise to each element if `a` or `b` is an array.
 * @throws `'Array length mismatch'` if `a` and `b` are arrays with different lengths
 * @example
 * multiply(6, 3) // returns 18
 * multiply([10, 20, 30, 40], 10) // returns [100, 200, 300, 400]
 * multiply(10, [1, 2, 5, 10]) // returns [10, 20, 50, 100]
 * multiply([1, 2, 3, 4], [2, 7, 5, 12]) // returns [2, 14, 15, 48]
 */

export function multiply(...args: NumberOrArray[]): NumberOrArray {
  return args.reduce((result, current) => {
    if (Array.isArray(result) && Array.isArray(current)) {
      if (current.length !== result.length) throw new Error('Array length mismatch');
      return result.map((val, i) => val * current[i]);
    }
    if (Array.isArray(result)) return result.map((val) => val * (current as number));
    if (Array.isArray(current)) return current.map((val) => (result as number) * val);
    return (result as number) * (current as number);
  }) as NumberOrArray;
}
