/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * Raises a number to a given exponent. For arrays, the function will be applied index-wise to each element.
 * @param {(number|number[])} a a number or an array of numbers
 * @param {(number)} b the power that `a` is raised to
 * @return {(number|number[])} `a` raised to the power of `b`. Returns an array with the each element raised to the power of `b` if `a` is an array.
 * @throws `'Missing exponent'` if `b` is not provided
 * @example
 * pow(2,3) // returns 8
 * pow([1, 2, 3], 4) // returns [1, 16, 81]
 */

module.exports = { pow };

function pow(a, b) {
  if (b == null) throw new Error('Missing exponent');
  if (Array.isArray(a)) {
    return a.map((a) => Math.pow(a, b));
  }
  return Math.pow(a, b);
}
