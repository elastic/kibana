/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * Returns the default provided value when the first value if null. If at least one array of numbers is passed into the function, the function will be applied index-wise to each element.
 * @param {(number|number[])} a a number or an array of numbers
 * @param {(number|number[])} b a number of an array of numbers to use as fallback value.
 * @throws `'Array length mismatch'` if `args` contains arrays of different lengths
 * @return {(number|number[])} The `a` value if not null, `b` otherwise. Returns an array where each element is default to `b` when null, or kept the original value if `a` is an array.
 *
 * @example
 * defaults(null, 1) // returns 1
 * defaults([3, null, 5], 1) // returns [3, 1, 5]
 * defaults(5, 1) // returns 5
 */

module.exports = { defaults };

function defaults(a, b) {
  if (Array.isArray(a)) {
    const bArray = Array.isArray(b) ? b : Array(a.length).fill(b);
    if (bArray.length < a.length) {
      throw new Error('Array length mismatch');
    }
    return a.map((v, i) => (v == null ? bArray[i] : v));
  }
  const fallback = Array.isArray(b) ? b[0] : b;
  return a == null ? fallback : a;
}
