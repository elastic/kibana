/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * Calculates the the cosine of a number. For arrays, the function will be applied index-wise to each element.
 * @param {(number|number[])} a a number or an array of numbers, `a` is expected to be given in radians.
 * @return {(number|number[])} The cosine of `a`. Returns an array with the the cosine of each element if `a` is an array.
 * @example
 * cos(0) // returns 1
 * cos(1.5707963267948966) // returns 6.123233995736766e-17
 * cos([0, 1.5707963267948966]) // returns [1, 6.123233995736766e-17]
 */

module.exports = { cos };

function cos(a) {
  if (Array.isArray(a)) {
    return a.map((a) => Math.cos(a));
  }
  return Math.cos(a);
}
