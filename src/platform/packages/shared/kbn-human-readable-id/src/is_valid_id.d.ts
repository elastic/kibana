/**
 * Validates that an ID is safe and matches the human-readable slug format.
 * Rejects prototype-pollution keys, path traversal, and non-slug characters.
 *
 * Does NOT check domain-specific reserved prefixes — consumers should compose
 * this with their own reserved-prefix check when needed.
 *
 * @param maxLength — Upper bound for the ID length. Defaults to {@link HUMAN_READABLE_ID_MAX_LENGTH} (255).
 * @param minLength — Lower bound for the ID length. Defaults to {@link HUMAN_READABLE_ID_MIN_LENGTH} (3).
 */
export declare const isValidId: (id: string, maxLength?: number, minLength?: number) => boolean;
