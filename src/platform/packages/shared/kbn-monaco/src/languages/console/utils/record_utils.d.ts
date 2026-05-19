/**
 * Type guard for values that are safe to treat as "object-like" during traversal.
 *
 * Note: Intentionally includes arrays. Use this as a traversal guard
 * (`typeof value === 'object' && value !== null`), not as a "plain object" check.
 */
export declare const isRecordLike: (value: unknown) => value is Record<string, unknown>;
