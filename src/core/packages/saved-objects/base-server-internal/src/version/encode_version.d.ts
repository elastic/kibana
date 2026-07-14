/**
 * Encode the sequence params into an "opaque" version string
 * that can be used in the saved object API in place of numeric
 * version numbers
 */
export declare function encodeVersion(seqNo?: number, primaryTerm?: number): string;
