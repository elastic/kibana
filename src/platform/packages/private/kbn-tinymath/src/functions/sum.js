/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const findSum = (total, current) => total + current;

/**
 * Calculates the sum of one or more numbers/arrays passed into the function. If an argument is an array, the function adds all of its elements. The arrays can have different lengths.
 * @param {...(number|number[])} args one or more numbers or arrays of numbers
 * @return {number} The sum of all numbers and all elements of any arrays in `args`
 *
 * @example
 * sum(1, 2, 3) // returns 6
 * sum([10, 20, 30, 40], 10, 20, 30) // returns 160
 * sum([1, 2], 3, [4, 5], 6) // returns sum(1, 2, 3, 4, 5, 6) = 21
 * sum([10, 20, 30, 40], 10, [1, 2, 3], 22) // returns sum(10, 20, 30, 40, 10, 1, 2, 3, 22) = 138
 */

function sum(...args) {
  return args.reduce((total, current) => {
    if (Array.isArray(current)) {
      return total + current.reduce(findSum, 0);
    }
    return total + current;
  }, 0);
}
module.exports = { sum };
