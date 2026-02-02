/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { add } from './add';

type NumberOrArray = number | number[];

/**
 * Finds the mean value of one of more numbers/arrays of numbers into the function. If at least one array of numbers is passed into the function, the function will find the mean by index.
 * @param {...(number|number[])} args one or more numbers or arrays of numbers
 * @return {(number|number[])} The mean value of all numbers if `args` contains only numbers. Returns an array with the the mean values of each index, including all scalar numbers in `args` in the calculation at each index if `args` contains at least one array.
 *
 * @example
 * mean(1, 2, 3) // returns 2
 * mean([10, 20, 30, 40], 20) // returns [15, 20, 25, 30]
 * mean([1, 9], 5, [3, 4]) // returns [mean([1, 5, 3]), mean([9, 5, 4])] = [3, 6]
 */

export function mean(...args: NumberOrArray[]): NumberOrArray {
  if (args.length === 1) {
    if (Array.isArray(args[0])) {
      // add() with a single array returns the sum as a number
      const sum = add(args[0]) as number;

      return sum / args[0].length;
    }
    return args[0];
  }

  const sum = add(...args);
  if (Array.isArray(sum)) {
    return sum.map((val) => val / args.length);
  }
  // sum is narrowed to number
  return sum / args.length;
}
