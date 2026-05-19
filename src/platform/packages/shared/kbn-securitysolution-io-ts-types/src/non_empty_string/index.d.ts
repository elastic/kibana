import * as t from 'io-ts';
/**
 * Types the NonEmptyString as:
 *   - A string that is not empty
 */
export declare const NonEmptyString: t.Type<string, string, unknown>;
export type NonEmptyStringC = typeof NonEmptyString;
