/**
 * OAuth token responses often use `token_type: "bearer"` (lowercase). If the stored header begins
 * with `bearer ` (after trim), rewrites the scheme to `Bearer `; otherwise returns the trimmed value.
 */
export declare function normalizeAuthorizationHeaderValue(value: string): string;
