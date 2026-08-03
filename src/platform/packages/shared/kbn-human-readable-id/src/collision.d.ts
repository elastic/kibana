/**
 * Builds a single suffixed candidate ID from a base ID and a numeric index.
 * Truncates the base when appending the suffix would exceed HUMAN_READABLE_ID_MAX_LENGTH
 * and strips trailing hyphens to prevent invalid double-hyphen sequences.
 */
export declare const buildSuffixedCandidate: (baseId: string, index: number) => string;
/**
 * Builds the list of candidate IDs for a given base ID:
 * [baseId, baseId-1, baseId-2, ..., baseId-{MAX_COLLISION_RETRIES}].
 *
 * When a base ID is near HUMAN_READABLE_ID_MAX_LENGTH and already ends with a
 * hyphen-digit pattern (e.g. `<252 chars>-1`), truncation + re-suffixing
 * can reconstruct the original base, producing a duplicate entry. Duplicates
 * are skipped so every element in the returned array is unique.
 */
export declare const buildCandidateIds: (baseId: string) => string[];
/**
 * Resolves a non-colliding ID by appending a numeric suffix (-1, -2, ...).
 * Returns the first ID that is not in `conflictIds`, or falls back to `fallbackId`.
 */
export declare const resolveCollisionId: (baseId: string, conflictIds: ReadonlySet<string>, fallbackId: string) => string;
