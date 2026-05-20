/**
 * Maps RRule frequency enum values to human-readable strings
 */
export declare const RRULE_FREQUENCY_MAP: Record<number, string>;
export declare const RRULE_FREQUENCY_REVERSE_MAP: Record<string, number>;
/**
 * Maps RRule frequency enum values to human-readable strings
 */
export declare const RRULE_INTERVAL_MAP: Record<number, string>;
/**
 * Converts RRule frequency enum to readable string
 */
export declare function getReadableFrequency(freq: number): string;
/**
 * Converts RRule interval enum to readable string
 */
export declare function getReadableInterval(freq: number, interval: number): string;
