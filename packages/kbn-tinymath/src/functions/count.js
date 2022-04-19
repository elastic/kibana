/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const { size } = require('./size');

/**
 * Returns the length of an array. Alias for size
 * @param {any[]} a array of any values
 * @return {(number)} The length of the array. Returns 1 if `a` is not an array.
 * @throws `'Must pass an array'` if `a` is not an array
 * @example
 * count([]) // returns 0
 * count([-1, -2, -3, -4]) // returns 4
 * count(100) // returns 1
 */

module.exports = { count };

function count(a) {
  return size(a);
}

count.skipNumberValidation = true;
