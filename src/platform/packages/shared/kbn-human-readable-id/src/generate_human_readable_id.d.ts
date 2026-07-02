/**
 * Generates a slug-based human-readable ID from a name, or falls back to a
 * `{fallbackPrefix}-{uuid}` ID when the name cannot produce a valid slug.
 *
 * Shared between client-side preview and server-side creation so both sides
 * produce identical IDs for the same input.
 */
export declare const generateHumanReadableId: (name?: string | null, options?: {
    fallbackPrefix?: string;
}) => string;
