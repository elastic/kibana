/** APM label identifying which chart-section call site produced an error. */
export type ChartSectionErrorSource = 'useFetchMetricsData' | 'useLensProps';
/** APM `error_type` label for non-render captures (vs. SectionFatalReactError). */
export declare const CHART_SECTION_ERROR_TYPE_LABEL = "ChartSectionNonRenderError";
/**
 * Correlation labels merged into the APM payload alongside the error.
 *
 * `profile_id` is required: it identifies which data source profile owns the
 * failing chart section and is the only label that lets us filter these
 * events in APM. `chart_id` is optional because not every call site has a
 * stable chart identifier (e.g. the grid-level fetch).
 */
interface ChartSectionErrorLabels {
    profile_id: string;
    chart_id?: string;
}
interface ReportChartSectionErrorArgs {
    error: unknown;
    source: ChartSectionErrorSource;
    labels: ChartSectionErrorLabels;
}
/**
 * Reports a non-render chart-section error to APM.
 * No-ops on `AbortError` (per `isSuppressedFetchError`) and non-Error values.
 */
export declare const reportChartSectionError: ({ error, source, labels: callerLabels, }: ReportChartSectionErrorArgs) => void;
export {};
