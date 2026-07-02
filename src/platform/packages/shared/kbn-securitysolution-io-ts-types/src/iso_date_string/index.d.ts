import * as t from 'io-ts';
/**
 * Types the IsoDateString as:
 *   - A string that is an ISOString
 */
export type IsoDateString = t.TypeOf<typeof IsoDateString>;
export declare const IsoDateString: t.Type<string, string, unknown>;
export type IsoDateStringC = typeof IsoDateString;
