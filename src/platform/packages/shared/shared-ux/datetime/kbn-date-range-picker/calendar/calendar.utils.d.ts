export type ScrollDirection = 'forward' | 'backward' | 'none';
/**
 * Determines scroll direction relative to today's month.
 * - 'forward': viewing past months, need to scroll forward to reach today
 * - 'backward': viewing future months, need to scroll backward to reach today
 * - 'none': today is visible in the current range
 */
export declare function getScrollDirection(startIndex: number, endIndex: number, todayIndex: number): ScrollDirection;
/**
 * Converts a virtual index to the corresponding month Date.
 * Index equal to `todayIndex` returns the current month.
 */
export declare function getMonthFromIndex(index: number, todayIndex: number, referenceDate?: Date): Date;
/**
 * Converts a date to its corresponding virtual index.
 * Inverse of `getMonthFromIndex`.
 */
export declare function getIndexFromDate(date: Date, todayIndex: number, referenceDate?: Date): number;
/**
 * Returns the icon type for the Today button based on scroll direction.
 */
export declare function getScrollDirectionIcon(direction: ScrollDirection): 'sortUp' | 'sortDown' | undefined;
