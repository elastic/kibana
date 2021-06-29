/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const { pow } = require('./pow.js');

/**
 * Calculates the cube of a number. For arrays, the function will be applied index-wise to each element.
 * @param {(number|number[])} a a number or an array of numbers
 * @return {(number|number[])} The cube of `a`. Returns an array with the the cubes of each element if `a` is an array.
 *
 * @example
 * cube(-3) // returns -27
 * cube([3, 4, 5]) // returns [27, 64, 125]
 */

module.exports = { cube };

function cube(a) {
  return pow(a, 3);
}
