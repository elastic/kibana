import type { TimePrecision, TimeRange, TimeRangeFormatOptions } from '../types';
/**
 * Trims a moment format string to the requested sub-minute precision.
 * - `'ms'`  — keep everything (seconds + milliseconds).
 * - `'s'`   — strip `.SSS`.
 * - `'none'`— strip `:ss.SSS` (and `:ss`).
 */
export declare function applyTimePrecision(format: string, precision?: TimePrecision): string;
/**
 * Converts a parsed TimeRange into a human-readable display string.
 * Absolute dates always use the picker's own format, never a consumer's input format.
 */
export declare function timeRangeToDisplayText(timeRange: TimeRange, options?: TimeRangeFormatOptions): string;
/**
 * Converts a parsed TimeRange into a fully formatted date string,
 * always rendering both start and end as absolute dates in the given format.
 */
export declare function timeRangeToFullFormattedText(timeRange: TimeRange, options?: TimeRangeFormatOptions): string;
/**
 * Parses date math like "now-7m" or "now+3d/d" into parts.
 * Returns `null` for values that are not relative date math (absolute dates, bare `now`, rounding-only).
 */
export declare function dateMathToRelativeParts(value: string): {
    count: number;
    unit: string;
    isFuture: boolean;
    round?: string;
} | null;
