/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const { log } = require('./log.js');

/**
 * Calculates the logarithm base 10 of a number. For arrays, the function will be applied index-wise to each element.
 * @param {(number|number[])} a a number or an array of numbers, `a` must be greater than 0
 * @return {(number|number[])} The logarithm of `a`. Returns an array with the the logarithms base 10 of each element if `a` is an array.
 * @throws `'Must be greater than 0'` if `a` < 0
 * @example
 * log(10) // returns 1
 * log(100) // returns 2
 * log(80) // returns 1.9030899869919433
 * log([10, 100, 1000, 10000, 100000]) // returns [1, 2, 3, 4, 5]
 */

module.exports = { log10 };

function log10(a) {
  return log(a, 10);
}
