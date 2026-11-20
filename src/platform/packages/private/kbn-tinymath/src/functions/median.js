/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const { transpose } = require('./lib/transpose');

const findMedian = (a) => {
  const len = a.length;
  const half = Math.floor(len / 2);

  a.sort((a, b) => b - a);

  if (len % 2 === 0) {
    return (a[half] + a[half - 1]) / 2;
  }

  return a[half];
};

/**
 * Finds the median value(s) of one or more numbers or arrays of numbers. If you pass several arguments and at least one is an array, the function will find the median by index.
 * @param {...(number|number[])} args one or more numbers or arrays of numbers
 * @return {(number|number[])} The median value of all numbers if `args` contains only numbers. Returns an array with the median values of each index, including all scalar numbers in `args` in the calculation at each index if you pass several arguments and at least one is an array. If you pass a single array, the result covers every element, and `median` sorts that array in place in descending order. A later use of the same array in the expression sees the sorted values.
 *
 * @throws `'Array length mismatch'` if `args` contains arrays of different lengths, unless the first array is empty, in which case the result is an empty array
 * @example
 * median(1, 1, 2, 3) // returns 1.5
 * median(1, 1, 2, 2, 3) // returns 2
 * median([10, 20, 30, 40], 10, 20, 30) // returns [15, 20, 25, 25]
 * median([1, 9], 2, 4, [3, 5]) // returns [median([1, 2, 4, 3]), median([9, 2, 4, 5])] = [2.5, 4.5]
 */

function median(...args) {
  if (args.length === 1) {
    if (Array.isArray(args[0])) return findMedian(args[0]);
    return args[0];
  }

  const firstArray = args.findIndex((element) => Array.isArray(element));
  if (firstArray !== -1) {
    const result = transpose(args, firstArray);
    return result.map((val) => findMedian(val));
  }
  return findMedian(args);
}
module.exports = { median };
