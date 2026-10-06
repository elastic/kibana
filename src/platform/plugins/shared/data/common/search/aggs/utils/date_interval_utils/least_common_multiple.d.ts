/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

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
export declare function leastCommonMultiple(a: number, b: number): number;
