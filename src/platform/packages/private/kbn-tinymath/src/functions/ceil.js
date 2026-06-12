/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Calculates the ceiling of a number, i.e. rounds a number towards positive infinity. For arrays, the function will be applied index-wise to each element.
 * @param {(number|number[])} a a number or an array of numbers
 * @return {(number|number[])} The ceiling of `a`. Returns an array with the the ceilings of each element if `a` is an array.
 *
 * @example
 * ceil(1.2) // returns 2
 * ceil(-1.8) // returns -1
 * ceil([1.1, 2.2, 3.3]) // returns [2, 3, 4]
 */

function ceil(a) {
  if (Array.isArray(a)) {
    return a.map((a) => Math.ceil(a));
  }
  return Math.ceil(a);
}

module.exports = { ceil };
