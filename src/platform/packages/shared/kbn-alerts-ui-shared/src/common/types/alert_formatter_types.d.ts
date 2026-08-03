/**
 * Standard formatting utilities provided to alert formatters
 */
export interface AlertFormatterFormatters {
    /**
     * Format a duration value (in microseconds) to a human-readable string
     * @param value - Duration in microseconds
     * @param options - Formatting options
     */
    asDuration: (value: number | null, options?: {
        extended?: boolean;
    }) => string;
    /**
     * Format a ratio as a percentage string
     * @param numerator - The numerator value
     * @param denominator - The denominator value
     * @param floor - Optional floor value to display when result is below threshold
     */
    asPercent: (numerator: number, denominator: number, floor?: string) => string;
}
/**
 * Result of formatting an alert for display
 */
export interface FormattedAlertInfo {
    /** Human-readable reason for the alert */
    reason: string;
    /** Optional deep link URL to view the alert in context */
    link?: string;
    /** Whether the link already includes the base path (default: false) */
    hasBasePath?: boolean;
}
/**
 * Alert formatter function type
 *
 * Used by rule types to provide alert-level context information
 * such as reason text and deep links to view alerts in their originating application.
 *
 * @example
 * ```typescript
 * const format: AlertFormatter = ({ fields, formatters }) => ({
 *   reason: `CPU usage exceeded ${fields['threshold']}%`,
 *   link: `/app/myapp/alert/${fields['alert.uuid']}`,
 * });
 * ```
 */
export type AlertFormatter<TFields = Record<string, unknown>> = (options: {
    /** Alert document fields */
    fields: TFields;
    /** Standard formatting utilities */
    formatters: AlertFormatterFormatters;
}) => FormattedAlertInfo;
