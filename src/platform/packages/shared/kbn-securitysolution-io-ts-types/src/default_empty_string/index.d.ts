import * as t from 'io-ts';
/**
 * Types the DefaultEmptyString as:
 *   - If null or undefined, then a default of an empty string "" will be used
 */
export declare const DefaultEmptyString: t.Type<string, string | undefined, unknown>;
