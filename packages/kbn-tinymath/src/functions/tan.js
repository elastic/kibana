/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * Calculates the the tangent of a number. For arrays, the function will be applied index-wise to each element.
 * @param {(number|number[])} a a number or an array of numbers, `a` is expected to be given in radians.
 * @return {(number|number[])} The tangent of `a`. Returns an array with the the tangent of each element if `a` is an array.
 * @example
 * tan(0) // returns 0
 * tan(1) // returns 1.5574077246549023
 * tan([0, 1, -1]) // returns [0, 1.5574077246549023, -1.5574077246549023]
 */

module.exports = { tan };

function tan(a) {
  if (Array.isArray(a)) {
    return a.map((a) => Math.tan(a));
  }
  return Math.tan(a);
}
