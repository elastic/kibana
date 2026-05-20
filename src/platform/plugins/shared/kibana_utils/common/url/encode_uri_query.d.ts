import type { ParsedQuery } from 'query-string';
/**
 * This method is intended for encoding *key* or *value* parts of query component. We need a custom
 * method because encodeURIComponent is too aggressive and encodes stuff that doesn't have to be
 * encoded per http://tools.ietf.org/html/rfc3986:
 *    query         = *( pchar / "/" / "?" )
 *    pchar         = unreserved / pct-encoded / sub-delims / ":" / "@"
 *    unreserved    = ALPHA / DIGIT / "-" / "." / "_" / "~"
 *    pct-encoded   = "%" HEXDIG HEXDIG
 *    sub-delims    = "!" / "$" / "&" / "'" / "(" / ")"
 *                     / "*" / "+" / "," / ";" / "="
 */
export declare function encodeUriQuery(val: string, pctEncodeSpaces?: boolean): string;
export declare const encodeQuery: (query: ParsedQuery, encodeFunction?: (val: string, pctEncodeSpaces?: boolean) => string, pctEncodeSpaces?: boolean) => ParsedQuery;
/**
 * Method to help modify url query params.
 *
 * @param params
 * @param key
 * @param value
 */
export declare const addQueryParam: (params: string, key: string, value?: string) => string;
