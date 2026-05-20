import * as t from 'io-ts';
/**
 * Types the positive integer are:
 *   - Natural Number (positive integer and not a float),
 *   - zero or greater
 */
export declare const PositiveInteger: t.Type<number, number, unknown>;
