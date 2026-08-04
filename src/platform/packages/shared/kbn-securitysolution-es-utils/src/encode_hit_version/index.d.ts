/**
 * Very similar to the encode_hit_version from saved object system from here:
 * src/core/server/saved_objects/version/encode_hit_version.ts
 *
 * with the most notably change is that it doesn't do any throws but rather just returns undefined
 * if _seq_no or _primary_term does not exist.
 * @param response The response to encode into a version by using _seq_no and _primary_term
 */
export declare const encodeHitVersion: <T>(hit: T) => string | undefined;
