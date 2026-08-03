/**
 * Centralized inventory of `error_type` label values emitted by chart-section
 * error reporting via @kbn/logging and @elastic/apm-rum. Keeping the values in
 * one place makes the package's log/APM signal grep-able and lets operators
 * build dashboards or alerts without hunting through source files.
 *
 * Values are PascalCase to match the existing APM `error_type` vocabulary. The
 * label key itself (`error_type`, snake_case) is written at the call sites
 * that emit it.
 */
export declare const ERROR_TYPE: {
    readonly APM_REPORTING_FAILURE: "APMReportingFailure";
    readonly CHART_SECTION_NON_RENDER_ERROR: "ChartSectionNonRenderError";
};
