import * as t from 'io-ts';
/**
 * Types the DefaultUuid as:
 *   - If null or undefined, then a default string uuidv4() will be
 *     created otherwise it will be checked just against an empty string
 */
export declare const DefaultUuid: t.Type<string, string | undefined, unknown>;
