/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * Returns the last element of an array. If anything other than an array is passed in, the input is returned.
 * @param {any[]} a array of any values
 * @return {*} The last element of `a`. Returns `a` if `a` is not an array.
 *
 * @example
 * last(2) // returns 2
 * last([1, 2, 3]) // returns 3
 */

module.exports = { last };

function last(a) {
  if (Array.isArray(a)) {
    return a[a.length - 1];
  }
  return a;
}

last.skipNumberValidation = true;
