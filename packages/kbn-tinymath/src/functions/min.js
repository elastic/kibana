/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * Finds the minimum value of one of more numbers/arrays of numbers into the function. If at least one array of numbers is passed into the function, the function will find the minimum by index.
 * @param {...(number|number[])} args one or more numbers or arrays of numbers
 * @return {(number|number[])} The minimum value of all numbers if `args` contains only numbers. Returns an array with the the minimum values of each index, including all scalar numbers in `args` in the calculation at each index if `a` is an array.
 * @throws `'Array length mismatch'` if `args` contains arrays of different lengths
 * @example
 * min(1, 2, 3) // returns 1
 * min([10, 20, 30, 40], 25) // returns [10, 20, 25, 25]
 * min([1, 9], 4, [3, 5]) // returns [min([1, 4, 3]), min([9, 4, 5])] = [1, 4]
 */

module.exports = { min };

function min(...args) {
  if (args.length === 1) {
    if (Array.isArray(args[0]))
      return args[0].reduce((result, current) => Math.min(result, current));
    return args[0];
  }

  return args.reduce((result, current) => {
    if (Array.isArray(result) && Array.isArray(current)) {
      if (current.length !== result.length) throw new Error('Array length mismatch');
      return result.map((val, i) => Math.min(val, current[i]));
    }
    if (Array.isArray(result)) return result.map((val) => Math.min(val, current));
    if (Array.isArray(current)) return current.map((val) => Math.min(val, result));
    return Math.min(result, current);
  });
}
