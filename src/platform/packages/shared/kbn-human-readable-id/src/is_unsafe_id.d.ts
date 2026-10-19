/**
 * Returns true if the ID is a known prototype-pollution key, empty, too long,
 * or contains path traversal sequences.
 *
 * @param maxLength — Upper bound for the ID length. Defaults to {@link HUMAN_READABLE_ID_MAX_LENGTH} (255).
 */
export declare const isUnsafeId: (id: string, maxLength?: number) => boolean;
