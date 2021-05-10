/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * Calculates the absolute value of a number. For arrays, the function will be applied index-wise to each element.
 * @param {(number|number[])} a a number or an array of numbers
 * @return {(number|number[])} The absolute value of `a`. Returns an array with the the absolute values of each element if `a` is an array.
 *
 * @example
 * abs(-1) // returns 1
 * abs(2) // returns 2
 * abs([-1 , -2, 3, -4]) // returns [1, 2, 3, 4]
 */

module.exports = { abs };

function abs(a) {
  if (Array.isArray(a)) {
    return a.map((a) => Math.abs(a));
  }
  return Math.abs(a);
}
