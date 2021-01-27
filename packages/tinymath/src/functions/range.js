/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { max } from './max.js';
import { min } from './min.js';
import { subtract } from './subtract.js';

/**
 * Finds the range of one of more numbers/arrays of numbers into the function. If at least one array of numbers is passed into the function, the function will find the range by index.
 * @param {...(number|number[])} args one or more numbers or arrays of numbers
 * @return {(number|number[])} The range value of all numbers if `args` contains only numbers. Returns an array with the the range values at each index, including all scalar numbers in `args` in the calculation at each index if `args` contains at least one array.
 *
 * @example
 * range(1, 2, 3) // returns 2
 * range([10, 20, 30, 40], 15) // returns [5, 5, 15, 25]
 * range([1, 9], 4, [3, 5]) // returns [range([1, 4, 3]), range([9, 4, 5])] = [3, 5]
 */

export function range(...args) {
  return subtract(max(...args), min(...args));
}
