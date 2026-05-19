/**
 * The report is considered expired if:
 * - `lastReportAt` does not exist, is NaN or `REPORT_INTERVAL_MS` have passed ever since.
 * @param lastReportAt
 * @returns `true` if the report interval is considered expired
 */
export declare function isReportIntervalExpired(lastReportAt: number | undefined): boolean;
