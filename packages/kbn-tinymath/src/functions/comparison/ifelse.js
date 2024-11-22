/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Evaluates the a conditional argument and returns one of the two values based on that.
 * @param {(boolean)} cond a boolean value
 * @param {(any|any[])} a a value or an array of any values
 * @param {(any|any[])} b a value or an array of any values
 * @return {(any|any[])} if the value of cond is truthy, return `a`, otherwise return `b`.
 * @throws `'Condition clause is of the wrong type'` if the `cond` provided is not of boolean type
 * @throws `'Missing a value'` if `a` is not provided
 * @throws `'Missing b value'` if `b` is not provided
 * @example
 * ifelse(5 > 6, 1, 0) // returns 0
 * ifelse(1 == 1, [1, 2, 3], 5) // returns [1, 2, 3]
 * ifelse(1 < 2, [1, 2, 3], [2, 3, 4]) // returns [1, 2, 3]
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
