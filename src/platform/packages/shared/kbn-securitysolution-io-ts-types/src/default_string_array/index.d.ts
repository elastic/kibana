import * as t from 'io-ts';
/**
 * Types the DefaultStringArray as:
 *   - If undefined, then a default array will be set
 *   - If an array is sent in, then the array will be validated to ensure all elements are a string
 */
export declare const DefaultStringArray: t.Type<string[], string[] | undefined, unknown>;
