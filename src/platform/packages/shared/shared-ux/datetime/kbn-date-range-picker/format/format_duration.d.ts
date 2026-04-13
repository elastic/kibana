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
