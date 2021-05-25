/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * Calculates the sum of one or more numbers/arrays passed into the function. If at least one array of numbers is passed into the function, the function will calculate the sum by index.
 * @param {...(number|number[])} args one or more numbers or arrays of numbers
 * @return {(number|number[])} The sum of all numbers in `args` if `args` contains only numbers. Returns an array of sums of the elements at each index, including all scalar numbers in `args` in the calculation at each index if `args` contains at least one array.
 * @throws `'Array length mismatch'` if `args` contains arrays of different lengths
 * @example
 * add(1, 2, 3) // returns 6
 * add([10, 20, 30, 40], 10, 20, 30) // returns [70, 80, 90, 100]
 * add([1, 2], 3, [4, 5], 6) // returns [(1 + 3 + 4 + 6), (2 + 3 + 5 + 6)] = [14, 16]
 */

module.exports = { add };

function add(...args) {
  if (args.length === 1) {
    if (Array.isArray(args[0])) return args[0].reduce((result, current) => result + current);
    return args[0];
  }

  return args.reduce((result, current) => {
    if (Array.isArray(result) && Array.isArray(current)) {
      if (current.length !== result.length) throw new Error('Array length mismatch');
      return result.map((val, i) => val + current[i]);
    }
    if (Array.isArray(result)) return result.map((val) => val + current);
    if (Array.isArray(current)) return current.map((val) => val + result);
    return result + current;
  });
}
