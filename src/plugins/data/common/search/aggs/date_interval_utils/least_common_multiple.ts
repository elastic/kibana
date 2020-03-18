/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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
