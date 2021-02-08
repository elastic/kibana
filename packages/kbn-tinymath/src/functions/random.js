/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * Generates a random number within the given range where the lower bound is inclusive and the upper bound is exclusive. If no numbers are passed in, it will return a number between 0 and 1. If only one number is passed in, it will return .
 * @param {number} a (optional) must be greater than 0 if `b` is not provided
 * @param {number} b (optional) must be greater
 * @return {number} A random number between 0 and 1 if no numbers are passed in. Returns a random number between 0 and `a` if only one number is passed in. Returns a random number between `a` and `b` if two numbers are passed in.
 * @throws `'Min is be greater than max'` if `a` < 0 when only `a` is passed in or if `a` > `b` when both `a` and `b` are passed in
 * @example
 * random() // returns a random number between 0 (inclusive) and 1 (exclusive)
 * random(10) // returns a random number between 0 (inclusive) and 10 (exclusive)
 * random(-10,10) // returns a random number between -10 (inclusive) and 10 (exclusive)
 */

module.exports = { random };

function random(a, b) {
  if (a == null) return Math.random();

  // a: max, generate random number between 0 and a
  if (b == null) {
    if (a < 0) throw new Error(`Min is greater than max`);
    return Math.random() * a;
  }

  // a: min, b: max, generate random number between a and b
  if (a > b) throw new Error(`Min is greater than max`);
  return Math.random() * (b - a) + a;
}
