/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * Calculates the floor of a number, i.e. rounds a number towards negative infinity. For arrays, the function will be applied index-wise to each element.
 * @param {(number|number[])} a a number or an array of numbers
 * @return {(number|number[])} The floor of `a`. Returns an array with the the floor of each element if `a` is an array.
 *
 * @example
 * floor(1.8) // returns 1
 * floor(-1.2) // returns -2
 * floor([1.7, 2.8, 3.9]) // returns [1, 2, 3]
 */

module.exports = { floor };

function floor(a) {
  if (Array.isArray(a)) {
    return a.map((a) => Math.floor(a));
  }
  return Math.floor(a);
}
