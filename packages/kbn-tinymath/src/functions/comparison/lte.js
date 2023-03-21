/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const { eq } = require('./eq');
const { lt } = require('./lt');

/**
 * Performs a lower than or equal comparison between two values.
 * @param {number|number[]} a a number or an array of numbers
 * @param {number|number[]} b a number or an array of numbers
 * @return {boolean} Returns true if `a` is lower than or equal to `b`, false otherwise.  Returns an array with the lower than or equal comparison of each element if `a` is an array.
 * @throws `'Array length mismatch'` if `args` contains arrays of different lengths
 * @example
 * lte(1, 1) // returns true
 * lte(1, 2) // returns true
 * lte([1, 2], 2) // returns [true, true]
 * lte([1, 2], [1, 1]) // returns [true, false]
 */

function lte(a, b) {
  return eq(a, b) || lt(a, b);
}
module.exports = { lte };
