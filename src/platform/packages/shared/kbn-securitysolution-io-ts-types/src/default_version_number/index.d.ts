import * as t from 'io-ts';
/**
 * Types the DefaultVersionNumber as:
 *   - If null or undefined, then a default of the number 1 will be used
 */
export declare const DefaultVersionNumber: t.Type<number, number | undefined, unknown>;
export type DefaultVersionNumberDecoded = t.TypeOf<typeof DefaultVersionNumber>;
