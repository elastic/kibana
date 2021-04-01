/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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
 * Finds the median value(s) of one of more numbers/arrays of numbers into the function. If at least one array of numbers is passed into the function, the function will find the median by index.
 * @param {...(number|number[])} args one or more numbers or arrays of numbers
 * @return {(number|number[])} The median value of all numbers if `args` contains only numbers. Returns an array with the the median values of each index, including all scalar numbers in `args` in the calculation at each index if `args` contains at least one array.
 *
 * @example
 * median(1, 1, 2, 3) // returns 1.5
 * median(1, 1, 2, 2, 3) // returns 2
 * median([10, 20, 30, 40], 10, 20, 30) // returns [15, 20, 25, 25]
 * median([1, 9], 2, 4, [3, 5]) // returns [median([1, 2, 4, 3]), median([9, 2, 4, 5])] = [2.5, 4.5]
 */

module.exports = { median };

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
