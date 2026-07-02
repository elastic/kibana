import * as t from 'io-ts';
export type StringToPositiveNumberC = t.Type<number, string, unknown>;
/**
 * Types the StrongToPositiveNumber as:
 *   - If a string this converts the string into a number
 *   - Ensures it is a number (and not NaN)
 *   - Ensures it is positive number
 */
export declare const StringToPositiveNumber: StringToPositiveNumberC;
