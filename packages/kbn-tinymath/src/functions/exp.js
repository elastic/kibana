/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * Calculates _e^x_ where _e_ is Euler's number. For arrays, the function will be applied index-wise to each element.
 * @param {(number|number[])} a a number or an array of numbers
 * @return {(number|number[])} `e^a`. Returns an array with the values of `e^x` evaluated where `x` is each element of `a` if `a` is an array.
 *
 * @example
 * exp(2) // returns e^2 = 7.3890560989306495
 * exp([1, 2, 3]) // returns [e^1, e^2, e^3] = [2.718281828459045, 7.3890560989306495, 20.085536923187668]
 */

module.exports = { exp };

function exp(a) {
  if (Array.isArray(a)) {
    return a.map((a) => Math.exp(a));
  }
  return Math.exp(a);
}
