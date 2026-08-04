export declare const MS_PER: {
    readonly second: 1000;
    readonly minute: number;
    readonly hour: number;
    readonly day: number;
    readonly week: number;
    readonly month: number;
    readonly year: number;
};
/**
 * Converts a duration between two dates into a short display string.
 * For example: "20min", "3d", "~1h"
 */
export declare function durationToDisplayShortText(startDate: Date, endDate: Date): string;
/**
 * Converts a duration between two dates into a full-words display string.
 * For example: "20 minutes", "3 days", "~1 hour"
 *
 * TODO: translate the output of this function using @kbn/i18n with ICU plural
 * syntax for each unit, same as the relative time text in `format_time_range.ts`.
 * https://github.com/elastic/eui-private/issues/534
 */
export declare function durationToDisplayFullText(startDate: Date, endDate: Date): string;
