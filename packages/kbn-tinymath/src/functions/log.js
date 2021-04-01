/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const changeOfBase = (a, b) => Math.log(a) / Math.log(b);

/**
 * Calculates the logarithm of a number. For arrays, the function will be applied index-wise to each element.
 * @param {(number|number[])} a a number or an array of numbers, `a` must be greater than 0
 * @param {{number}} b (optional) base for the logarithm. If not provided a value, the default base is e, and the natural log is calculated.
 * @return {(number|number[])} The logarithm of `a`. Returns an array with the the logarithms of each element if `a` is an array.
 * @throws `'Base out of range'` if `b` <= 0
 * - 'Must be greater than 0' if `a` > 0
 * @example
 * log(1) // returns 0
 * log(64, 8) // returns 2
 * log(42, 5) // returns 2.322344707681546
 * log([2, 4, 8, 16, 32], 2) // returns [1, 2, 3, 4, 5]
 */

module.exports = { log };

function log(a, b = Math.E) {
  if (b <= 0) throw new Error('Base out of range');

  if (Array.isArray(a)) {
    return a.map((a) => {
      if (a < 0) throw new Error('Must be greater than 0');
      return changeOfBase(a, b);
    });
  }
  if (a < 0) throw new Error('Must be greater than 0');
  return changeOfBase(a, b);
}
