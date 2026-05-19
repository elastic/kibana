import * as t from 'io-ts';
/**
 * Types the risk score as:
 *   - Natural Number (positive integer and not a float),
 *   - Between the values [0 and 100] inclusive.
 */
export declare const UUID: t.Type<string, string, unknown>;
export type UUIDC = typeof UUID;
