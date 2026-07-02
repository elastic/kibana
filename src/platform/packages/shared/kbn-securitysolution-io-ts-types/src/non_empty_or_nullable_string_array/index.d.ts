import * as t from 'io-ts';
/**
 * Types the nonEmptyOrNullableStringArray as:
 *   - An array of non empty strings of length 1 or greater
 *   - This differs from NonEmptyStringArray in that both input and output are type array
 *
 */
export declare const nonEmptyOrNullableStringArray: t.Type<string[], string[], unknown>;
export type NonEmptyOrNullableStringArray = t.OutputOf<typeof nonEmptyOrNullableStringArray>;
export type NonEmptyOrNullableStringArrayDecoded = t.TypeOf<typeof nonEmptyOrNullableStringArray>;
