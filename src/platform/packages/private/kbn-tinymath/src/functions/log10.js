/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const { log } = require('./log');

/**
 * Deprecated. Call `log(a, 10)` instead. Expressions can't call `log10`, because function names can't contain digits.
 * @param {(number|number[])} a a number or an array of numbers, `a` can't be negative
 * @return {(number|number[])} The logarithm of `a`. Returns an array with the logarithms base 10 of each element if `a` is an array. The result can differ from the exact value in the last digits, as in `log(1000, 10)`, which returns `2.9999999999999996`.
 * @throws `'Must be greater than 0'` if `a` < 0
 * @example
 * log(10, 10) // returns 1
 * log(100, 10) // returns 2
 * log(80, 10) // returns 1.9030899869919433
 * log([10, 100, 10000, 100000], 10) // returns [1, 2, 4, 5]
 */

function log10(a) {
  return log(a, 10);
}
module.exports = { log10 };
