/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * Returns the first element of an array. If anything other than an array is passed in, the input is returned.
 * @param {any[]} a array of any values
 * @return {*} The first element of `a`. Returns `a` if `a` is not an array.
 *
 * @example
 * first(2) // returns 2
 * first([1, 2, 3]) // returns 1
 */

module.exports = { first };

function first(a) {
  if (Array.isArray(a)) {
    return a[0];
  }
  return a;
}

first.skipNumberValidation = true;
