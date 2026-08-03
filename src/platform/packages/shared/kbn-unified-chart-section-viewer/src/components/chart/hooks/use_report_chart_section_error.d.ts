/** APM label identifying which chart-section call site produced an error. */
export type ChartSectionErrorSource = 'useFetchMetricsData' | 'useLensProps' | 'useMetricSourceKind';
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
    page?: string;
}
export interface ReportChartSectionErrorArgs {
    error: unknown;
    source: ChartSectionErrorSource;
    labels: ChartSectionErrorLabels;
}
/**
 * Returns a stable reporter bound to the package logger from
 * {@link useExternalServices}.
 */
export declare const useReportChartSectionError: () => ((args: ReportChartSectionErrorArgs) => void);
export {};
