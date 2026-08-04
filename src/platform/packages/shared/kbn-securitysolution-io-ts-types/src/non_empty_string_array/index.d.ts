import * as t from 'io-ts';
/**
 * Types the NonEmptyStringArray as:
 *   - A string that is not empty (which will be turned into an array of size 1)
 *   - A comma separated string that can turn into an array by splitting on it
 *   - Example input converted to output: "a,b,c" -> ["a", "b", "c"]
 */
export declare const NonEmptyStringArray: t.Type<string[], string, unknown>;
export type NonEmptyStringArray = t.OutputOf<typeof NonEmptyStringArray>;
export type NonEmptyStringArrayDecoded = t.TypeOf<typeof NonEmptyStringArray>;
