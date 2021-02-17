/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * Calculates the cube root of a number. For arrays, the function will be applied index-wise to each element.
 * @param {(number|number[])} a a number or an array of numbers
 * @return {(number|number[])} The cube root of `a`. Returns an array with the the cube roots of each element if `a` is an array.
 *
 * @example
 * cbrt(-27) // returns -3
 * cbrt(94) // returns 4.546835943776344
 * cbrt([27, 64, 125]) // returns [3, 4, 5]
 */

module.exports = { cbrt };

function cbrt(a) {
  if (Array.isArray(a)) {
    return a.map((a) => Math.cbrt(a));
  }
  return Math.cbrt(a);
}
