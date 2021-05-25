/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * Returns the length of an array. Alias for count
 * @param {any[]} a array of any values
 * @return {(number)} The length of the array. Returns 1 if `a` is not an array.
 * @throws `'Must pass an array'` if `a` is not an array
 * @example
 * size([]) // returns 0
 * size([-1, -2, -3, -4]) // returns 4
 * size(100) // returns 1
 */

module.exports = { size };

function size(a) {
  if (Array.isArray(a)) return a.length;
  throw new Error('Must pass an array');
}

size.skipNumberValidation = true;
