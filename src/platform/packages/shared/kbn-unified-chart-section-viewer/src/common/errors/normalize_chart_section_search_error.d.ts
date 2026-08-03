/**
 * Normalizes fetch-layer failures from chart section ES|QL queries into an `Error`
 * suitable for Discover's `ErrorCallout` and related display helpers.
 */
export declare const normalizeChartSectionSearchError: (error: unknown) => Error;
