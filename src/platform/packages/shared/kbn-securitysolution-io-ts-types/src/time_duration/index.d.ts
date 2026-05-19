import * as t from 'io-ts';
/**
 * Types the TimeDuration as:
 *   - A string that is not empty, and composed of a positive integer greater than 0 followed by a unit of time
 *   - in the format {safe_integer}{timeUnit}, e.g. "30s", "1m", "2h", "7d"
 */
type TimeUnits = 's' | 'm' | 'h' | 'd' | 'w' | 'y';
interface TimeDurationType {
    allowedUnits: TimeUnits[];
}
export declare const TimeDuration: ({ allowedUnits }: TimeDurationType) => t.Type<string, string, unknown>;
export type TimeDurationC = typeof TimeDuration;
export {};
