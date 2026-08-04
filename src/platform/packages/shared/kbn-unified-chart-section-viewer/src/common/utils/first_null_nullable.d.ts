/**
 * Returns the "primary" (first/single) value for display or chart use.
 * - If value is an array: returns the first element that is not null/undefined, or undefined.
 */
export declare function firstNonNullable<T>(values: T[]): T extends NonNullable<T> ? T : T | undefined;
