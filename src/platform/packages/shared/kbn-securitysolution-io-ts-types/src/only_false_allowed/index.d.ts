import * as t from 'io-ts';
/**
 * Types the OnlyFalseAllowed as:
 *   - If null or undefined, then a default false will be set
 *   - If true is sent in then this will return an error
 *   - If false is sent in then this will allow it only false
 */
export declare const OnlyFalseAllowed: t.Type<boolean, boolean | undefined, unknown>;
