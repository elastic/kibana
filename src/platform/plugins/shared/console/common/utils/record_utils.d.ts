/**
 * Type guard for indexable records. Excludes arrays and null.
 */
export declare const isRecord: (value: unknown) => value is Record<string, unknown>;
