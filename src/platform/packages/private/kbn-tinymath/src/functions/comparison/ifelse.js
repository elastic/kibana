/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Returns one of two values, depending on a condition.
 * @param {(boolean)} cond a condition, such as `5 > 6` or the result of a comparison function
 * @param {(any|any[])} a the value to return if `cond` is true
 * @param {(any|any[])} b the value to return if `cond` is false
 * @return {(any|any[])} `a` if `cond` is true, otherwise `b`. TinyMath evaluates both `a` and `b` first, so an error in either one stops the expression. For example, `ifelse(5 < 6, 1, 1 / 0)` throws `'Cannot divide by 0'`. Comparing arrays gives one boolean. `ifelse` therefore picks one value for the whole array, not one per element.
 * @throws `'Condition clause is of the wrong type'` if `cond` is not a boolean
 * @throws `'Missing a value'` if `a` is not provided or is null
 * @throws `'Missing b value'` if `b` is not provided or is null
 * @example
 * ifelse(5 > 6, 1, 0) // returns 0
 * ifelse(1 == 1, 7, 5) // returns 7
 * ifelse(1 < 2, [1, 2, 3], [2, 3, 4]) // returns [1, 2, 3]
 * ifelse(gt([0, 3], 1), 10, 20) // returns 20
 */

function ifelse(cond, a, b) {
  if (typeof cond !== 'boolean') {
    throw Error('Condition clause is of the wrong type');
  }
  if (a == null) {
    throw new Error('Missing a value');
  }
  if (b == null) {
    throw new Error('Missing b value');
  }
  return cond ? a : b;
}

ifelse.skipNumberValidation = true;
module.exports = { ifelse };
