/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const fixer = (a) => {
  if (a > 0) {
    return Math.floor(a);
  }
  return Math.ceil(a);
};

/**
 * Calculates the fix of a number, i.e. rounds a number towards 0. For arrays, the function will be applied index-wise to each element.
 * @param {(number|number[])} a a number or an array of numbers
 * @return {(number|number[])} The fix of `a`. Returns an array with the the fixes for each element if `a` is an array.
 *
 * @example
 * fix(1.2) // returns 1
 * fix(-1.8) // returns -1
 * fix([1.8, 2.9, -3.7, -4.6]) // returns [1, 2, -3, -4]
 */

module.exports = { fix };

function fix(a) {
  if (Array.isArray(a)) {
    return a.map((a) => fixer(a));
  }
  return fixer(a);
}
