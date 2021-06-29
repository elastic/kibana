/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * Counts the number of unique values in an array
 * @param {any[]} a array of any values
 * @return {number} The number of unique values in the array. Returns 1 if `a` is not an array.
 *
 * @example
 * unique(100) // returns 1
 * unique([]) // returns 0
 * unique([1, 2, 3, 4]) // returns 4
 * unique([1, 2, 3, 4, 2, 2, 2, 3, 4, 2, 4, 5, 2, 1, 4, 2]) // returns 5
 */

module.exports = { unique };

function unique(a) {
  if (Array.isArray(a)) {
    return a.filter((val, i) => a.indexOf(val) === i).length;
  }
  return 1;
}

unique.skipNumberValidation = true;
