/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * Evaluates the a conditional argument and returns one of the two values based on that.
 * @param {(boolean)} cond a boolean value
 * @param {(any|any[])} a a value or an array of any values
 * @param {(any|any[])} b a value or an array of any values
 * @return {(any|any[])} if the value of cond is truthy, return `a`, otherwise return `b`.
 * @example
 * ifelse( 5 > 6, 1, 0) // returns 0
 * ifelse( 1 == 1, [1, 2, 3], 5) // returns [1, 2, 3]
 * ifelse( 1 < 2, [1, 2, 3], [2, 3, 4]) // returns [1, 2, 3]
 */

module.exports = { ifelse };

function ifelse(cond, whenTrue, whenFalse) {
  if (typeof cond !== 'boolean') {
    throw Error('Condition clause is of the wrong type');
  }
  return cond ? whenTrue : whenFalse;
}

ifelse.skipNumberValidation = true;
