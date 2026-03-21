import type { AlertFormatterFormatters } from '../types/alert_formatter_types';
/**
 * Format a duration value (in microseconds) to a human-readable string
 *
 * @param value - Duration in microseconds (note: microseconds, not milliseconds)
 * @param options - Formatting options
 * @returns Formatted duration string
 */
export declare function asDuration(value: number | null, options?: {
    extended?: boolean;
}): string;
/**
 * Format a ratio as a percentage string
 *
 * @param numerator - The numerator value
 * @param denominator - The denominator value
 * @param floor - Optional floor value to display when denominator is 0 or numerator is not a number
 * @returns Formatted percentage string
 */
export declare function asPercent(numerator: number, denominator: number, floor?: string): string;
/**
 * Default alert formatter utilities
 *
 * Provides standard formatting functions for use in alert formatters.
 */
export declare const defaultAlertFormatterFormatters: AlertFormatterFormatters;
