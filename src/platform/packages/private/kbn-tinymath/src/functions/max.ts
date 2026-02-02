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
 * Finds the maximum value of one of more numbers/arrays of numbers into the function. If at least one array of numbers is passed into the function, the function will find the maximum by index.
 * @param {...(number|number[])} args one or more numbers or arrays of numbers
 * @return {(number|number[])} The maximum value of all numbers if `args` contains only numbers. Returns an array with the the maximum values of each index, including all scalar numbers in `args` in the calculation at each index if `a` is an array.
 * @throws `'Array length mismatch'` if `args` contains arrays of different lengths
 * @example
 * max(1, 2, 3) // returns 3
 * max([10, 20, 30, 40], 25) // returns [25, 25, 30, 40]
 * max([1, 9], 4, [3, 5]) // returns [max([1, 4, 3]), max([9, 4, 5])] = [4, 9]
 */

export function max(...args: NumberOrArray[]): NumberOrArray {
  if (args.length === 1) {
    if (Array.isArray(args[0])) {
      return args[0].reduce((result, current) => Math.max(result, current));
    }
    return args[0];
  }

  return args.reduce((result: NumberOrArray, current: NumberOrArray): NumberOrArray => {
    if (Array.isArray(result)) {
      if (Array.isArray(current)) {
        if (current.length !== result.length) throw new Error('Array length mismatch');

        return result.map((val, i) => Math.max(val, current[i]));
      }

      // current is narrowed to number
      return result.map((val) => Math.max(val, current));
    }
    // result is narrowed to number
    if (Array.isArray(current)) {
      return current.map((val) => Math.max(val, result));
    }
    // both result and current are narrowed to number
    return Math.max(result, current);
  });
}
