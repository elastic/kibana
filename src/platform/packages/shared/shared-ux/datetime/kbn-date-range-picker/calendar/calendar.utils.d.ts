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
/**
 * Returns the day button that should receive focus when tabbing into the
 * calendar: the focus-target day (`tabindex="0"`) of the month currently in
 * view. Every mounted react-day-picker instance has exactly one such day, so
 * a scroller-wide query would match the first mounted month — many months
 * before the one the scroller is centered on.
 *
 * Falls back to the scroller-wide `[tabindex="0"]` when no month wrapper
 * matches.
 */
export declare function getMonthInViewFocusTarget(scroller: HTMLElement): HTMLElement | null;
