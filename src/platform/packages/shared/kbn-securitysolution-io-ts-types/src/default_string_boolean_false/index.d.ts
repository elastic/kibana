import * as t from 'io-ts';
/**
 * Types the DefaultStringBooleanFalse as:
 *   - If a string this will convert the string to a boolean
 *   - If null or undefined, then a default false will be set
 */
export declare const DefaultStringBooleanFalse: t.Type<boolean, string | boolean | undefined, unknown>;
export type DefaultStringBooleanFalseC = typeof DefaultStringBooleanFalse;
