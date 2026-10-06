/**
 * Any value that can be represented in RISON — a superset of JSON primitives
 * that also supports nested objects and arrays.
 */
export type RisonValue = boolean | string | number | RisonValue[] | {
    [key: string]: RisonValue;
} | null;
/**
 * RISON-encode a JavaScript value, returning `undefined` when the value cannot
 * be represented in RISON (e.g. functions, symbols, or circular references).
 * Use {@link encode} when the input is expected to always be encodable.
 *
 * @param obj - The value to encode. Typed as `any` because this function is
 *   intentionally used to probe whether an arbitrary runtime value is
 *   RISON-encodable before committing to encoding it.
 * @returns The RISON-encoded string, or `undefined` if the value is not encodable.
 */
export declare function encodeUnknown(obj: any): string | undefined;
/**
 * RISON-encode a JavaScript value, throwing if the value cannot be encoded.
 * For values of unknown encodability, prefer {@link encodeUnknown}.
 *
 * @param obj - The JavaScript value to encode. Typed as `any` because RISON
 *   encoding is used to serialize arbitrary application state (e.g. URL
 *   parameters) whose shape is not known at compile time.
 * @returns The RISON-encoded string.
 */
export declare function encode(obj: any): string;
/**
 * Parse a RISON string into a JavaScript structure.
 *
 * @param rison - The RISON-encoded string to decode.
 * @returns The decoded JavaScript value as a {@link RisonValue}.
 */
export declare function decode(rison: string): RisonValue;
/**
 * Parse a RISON string into a JavaScript structure, returning `null` instead
 * of throwing when the input is invalid.
 *
 * @param rison - The RISON-encoded string to decode.
 * @returns The decoded {@link RisonValue}, or `null` if the string is not valid RISON.
 */
export declare function safeDecode(rison: string): RisonValue;
/**
 * RISON-encode a JavaScript array using A-RISON format (without surrounding
 * parentheses), suitable for use in URL array parameters.
 *
 * @param array - The array to encode. Typed as `any[]` because the array
 *   elements may be arbitrary application state values.
 * @returns The A-RISON-encoded string.
 */
export declare function encodeArray(array: any[]): any;
/**
 * Parse an A-RISON string (a RISON array without surrounding parentheses)
 * into a JavaScript array. This prepends array markup before passing to the
 * standard RISON decoder.
 *
 * @param rison - The A-RISON-encoded string to decode.
 * @returns The decoded array of {@link RisonValue} elements.
 */
export declare function decodeArray(rison: string): RisonValue[];
