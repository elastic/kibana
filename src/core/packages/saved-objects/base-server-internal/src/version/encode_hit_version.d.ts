/**
 * Helper for encoding a version from a "hit" (hits.hits[#] from _search) or
 * "doc" (body from GET, update, etc) object
 */
export declare function encodeHitVersion(response: {
    _seq_no?: number;
    _primary_term?: number;
}): string;
