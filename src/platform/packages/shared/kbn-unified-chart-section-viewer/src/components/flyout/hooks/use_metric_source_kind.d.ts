export declare const METRIC_SOURCE_KIND: {
    readonly DATA_STREAM: "data_stream";
    readonly INDEX: "index";
};
export type MetricSourceKind = (typeof METRIC_SOURCE_KIND)[keyof typeof METRIC_SOURCE_KIND];
export interface UseMetricSourceKindParams {
    name: string | undefined;
    fallback: MetricSourceKind;
}
export interface UseMetricSourceKindResult {
    kind: MetricSourceKind;
}
/**
 * Classifies a metric source via `dataViews.getIndices` (`_resolve/index`).
 * Best-effort: returns `fallback` whenever the kind cannot be determined
 * (missing `dataViewsService`, missing `name`, request in flight, fetch error,
 * or source not found in the response). Only flips when the response confirms
 * a different kind for the current `name`.
 *
 * Multiple consumers asking for the same `name` share a single in-flight
 * request via the module-level cache below.
 */
export declare const useMetricSourceKind: ({ name, fallback, }: UseMetricSourceKindParams) => UseMetricSourceKindResult;
/**
 * Clears the cache above. Call when previous classifications are known to
 * be stale (e.g. between tests).
 */
export declare const resetMetricSourceKindCache: () => void;
