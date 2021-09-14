/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const { transpose } = require('./lib/transpose');

const findMode = (a) => {
  let maxFreq = 0;
  const mapping = {};

  a.map((val) => {
    if (mapping[val] === undefined) {
      mapping[val] = 0;
    }
    mapping[val] += 1;
    if (mapping[val] > maxFreq) {
      maxFreq = mapping[val];
    }
  });

  return Object.keys(mapping)
    .filter((key) => mapping[key] === maxFreq)
    .map((val) => parseFloat(val))
    .sort((a, b) => a - b);
};

/**
 * Finds the mode value(s) of one of more numbers/arrays of numbers into the function. If at least one array of numbers is passed into the function, the function will find the mode by index.
 * @param {...(number|number[])} args one or more numbers or arrays of numbers
 * @return {(number[]|number[][])} An array mode value(s) of all numbers if `args` contains only numbers. Returns an array of arrays with mode value(s) of each index, including all scalar numbers in `args` in the calculation at each index  if `args` contains at least one array.
 *
 * @example
 * mode(1, 1, 2, 3) // returns [1]
 * mode(1, 1, 2, 2, 3) // returns [1,2]
 * mode([10, 20, 30, 40], 10, 20, 30) // returns [[10], [20], [30], [10, 20, 30, 40]]
 * mode([1, 9], 1, 4, [3, 5]) // returns [mode([1, 1, 4, 3]), mode([9, 1, 4, 5])] = [[1], [4, 5, 9]]
 */

module.exports = { mode };

function mode(...args) {
  if (args.length === 1) {
    if (Array.isArray(args[0])) return findMode(args[0]);
    return args[0];
  }

  const firstArray = args.findIndex((element) => Array.isArray(element));
  if (firstArray !== -1) {
    const result = transpose(args, firstArray);
    return result.map((val) => findMode(val));
  }
  return findMode(args);
}
