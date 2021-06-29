/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * Finds the maximum value of one of more numbers/arrays of numbers into the function. If at least one array of numbers is passed into the function, the function will find the maximum by index.
 * @param {...(number|number[])} args one or more numbers or arrays of numbers
 * @return {(number|number[])} The maximum value of all numbers if `args` contains only numbers. Returns an array with the the maximum values at each index, including all scalar numbers in `args` in the calculation at each index if `args` contains at least one array.
 * @throws `'Array length mismatch'` if `args` contains arrays of different lengths
 * @example
 * max(1, 2, 3) // returns 3
 * max([10, 20, 30, 40], 15) // returns [15, 20, 30, 40]
 * max([1, 9], 4, [3, 5]) // returns [max([1, 4, 3]), max([9, 4, 5])] = [4, 9]
 */

module.exports = { max };

function max(...args) {
  if (args.length === 1) {
    if (Array.isArray(args[0]))
      return args[0].reduce((result, current) => Math.max(result, current));
    return args[0];
  }

  return args.reduce((result, current) => {
    if (Array.isArray(result) && Array.isArray(current)) {
      if (current.length !== result.length) throw new Error('Array length mismatch');
      return result.map((val, i) => Math.max(val, current[i]));
    }
    if (Array.isArray(result)) return result.map((val) => Math.max(val, current));
    if (Array.isArray(current)) return current.map((val) => Math.max(val, result));
    return Math.max(result, current);
  });
}
