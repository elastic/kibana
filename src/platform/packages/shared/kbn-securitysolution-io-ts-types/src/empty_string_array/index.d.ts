import * as t from 'io-ts';
/**
 * Types the EmptyStringArray as:
 *   - A value that can be undefined, or null (which will be turned into an empty array)
 *   - A comma separated string that can turn into an array by splitting on it
 *   - Example input converted to output: undefined -> []
 *   - Example input converted to output: null -> []
 *   - Example input converted to output: "a,b,c" -> ["a", "b", "c"]
 */
export declare const EmptyStringArray: t.Type<string[], string | null | undefined, unknown>;
export type EmptyStringArrayEncoded = t.OutputOf<typeof EmptyStringArray>;
export type EmptyStringArrayDecoded = t.TypeOf<typeof EmptyStringArray>;
