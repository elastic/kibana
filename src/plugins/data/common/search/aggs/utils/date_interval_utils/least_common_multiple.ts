/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

/**
 * Calculates the greates common divisor of two numbers. This will be the
 * greatest positive integer number, that both input values share as a divisor.
 *
 * This method does not properly work for fractional (non integer) numbers. If you
 * pass in fractional numbers there usually will be an output, but that's not necessarily
 * the greatest common divisor of those two numbers.
 *
 * @private
 */
function greatestCommonDivisor(a: number, b: number): number {
  return a === 0 ? Math.abs(b) : greatestCommonDivisor(b % a, a);
}

/**
 * Calculates the least common multiple of two numbers. The least common multiple
 * is the smallest positive integer number, that is divisible by both input parameters.
 *
 * Since this calculation suffers from rounding issues in decimal values, this method
 * won't work for passing in fractional (non integer) numbers. It will return a value,
 * but that value won't necessarily be the mathematical correct least common multiple.
 *
 * @internal
 */
export function leastCommonMultiple(a: number, b: number): number {
  return Math.abs((a * b) / greatestCommonDivisor(a, b));
}
