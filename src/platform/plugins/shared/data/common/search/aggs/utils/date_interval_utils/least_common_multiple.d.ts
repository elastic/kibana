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
