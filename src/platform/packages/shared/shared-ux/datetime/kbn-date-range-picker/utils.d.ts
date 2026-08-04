import type { RefObject } from 'react';
import type { TimePrecision, TimeRange, TimeRangeBoundsOption, TimeRangeTransformOptions, InitialFocus, AutoRefreshIntervalUnit } from './types';
import type { RangePart } from './parse/parse_range_parts';
/**
 * Converts an interval in milliseconds to a count and unit for display.
 *
 * @param intervalMs - The interval in milliseconds.
 * @param unit - The unit to use for the display.
 * If `unit` is provided, that unit is used (count is rounded to the nearest whole step).
 * If omitted, picks the largest unit (hours, then minutes, then seconds) that divides
 * `intervalMs` evenly so common values round-trip without drifting (e.g. 90s stays 90s, not 2m).
 *
 * @returns The count and unit for the display.
 */
export declare function msToAutoRefreshInterval(intervalMs: number, unit?: AutoRefreshIntervalUnit): {
    count: number;
    unit: AutoRefreshIntervalUnit;
};
/**
 * Converts a count and unit to milliseconds.
 *
 * @param count - The count to convert to milliseconds.
 * @param unit - The unit to convert to milliseconds.
 *
 * @returns The milliseconds.
 */
export declare function autoRefreshIntervalToMs(count: number, unit: AutoRefreshIntervalUnit): number;
/**
 * Formats total seconds as a realtime countdown for the toolbar (mm:ss, or hh:mm:ss when hours remain).
 *
 * @param totalSeconds - The total seconds to format.
 *
 * @returns The formatted countdown string.
 */
export declare function formatAutoRefreshCountdown(totalSeconds: number): string;
/**
 * Ceil(ms → seconds) for auto-refresh timer and toolbar; non-negative and safe for invalid ms.
 * Matches `useAutoRefresh` tick length.
 *
 * @param intervalMs - The interval in milliseconds.
 *
 * @returns The total seconds.
 */
export declare function msToSeconds(intervalMs: number): number;
/**
 * Formats a Date using the default DateRangePicker format, adjusted for the
 * requested sub-minute precision. Uses moment so the result respects whatever
 * global timezone Kibana has configured via `moment.tz.setDefault(...)`.
 */
export declare function formatAbsoluteDate(d: Date, precision?: TimePrecision): string;
/**
 * Formats a Date as a local ISO-8601 string with full precision but no UTC offset ("Z").
 * e.g. a local 14:12:59.531 → "2026-03-04T14:12:59.531"
 *
 * @deprecated Use `formatAbsoluteDate` instead, which respects moment's configured timezone.
 */
export declare function toLocalPreciseString(d: Date): string;
/**
 * Check a time range is valid
 */
export declare function isValidTimeRange(range: TimeRange): boolean;
/**
 * Returns `true` when the range label already conveys its duration, making
 * the badge redundant. This includes relative-to-now ranges (e.g. "Last 15
 * minutes") and named ranges (e.g. "today", "yesterday", "this week").
 */
export declare function isRelativeToNow(range: TimeRange): boolean;
/**
 * Resolve the `initialFocus` target within the panel.
 * A string is treated as a CSS selector; a ref as a direct element handle.
 * Falls back to the panel div itself when unset.
 */
export declare function resolveInitialFocus(panelRef: RefObject<HTMLElement>, initialFocus?: InitialFocus): HTMLElement | null;
/**
 * Returns a human-readable display label for a time range option.
 *
 * Natural-language labels (e.g. "Last 15 minutes", "Today") are kept verbatim —
 * they carry semantics the bounds alone can't reconstruct (e.g. "now/d to now/d"
 * is "Today"). Every other label is regenerated from the bounds using the same
 * pipeline as the control button (build text → parse → format), so the list always
 * uses the `→` delimiter and honours the current `timePrecision`, rather than
 * echoing a frozen display string or a raw input-form label saved earlier.
 */
export declare function getOptionDisplayLabel(option: TimeRangeBoundsOption, options?: Pick<TimeRangeTransformOptions, 'timePrecision' | 'presets' | 'dateFormat' | 'locale'>): string;
/**
 * Generates a compact offset shorthand from a time range option's bounds,
 * without resolving to absolute dates. Returns `null` when any bound is
 * absolute (no stable offset) or when both bounds are `now`.
 *
 * @example
 * getOptionShorthand({ start: 'now-15m', end: 'now' }) // "-15m"
 * getOptionShorthand({ start: 'now', end: 'now+3d' })  // "+3d"
 * getOptionShorthand({ start: 'now-7d', end: 'now-1d' }) // "-7d - -1d"
 * getOptionShorthand({ start: '2025-01-01', end: 'now' }) // null
 */
export declare function getOptionShorthand(option: TimeRangeBoundsOption): string | null;
/**
 * Determines the text to populate the input with when an option is selected.
 *
 * 1. If the option has a natural-language label (e.g. "Last 15 minutes", "Today"),
 *    returns it so that input round-trips. Only natural-language labels qualify:
 *    display-form labels (e.g. "Feb 3 → Feb 10") must not leak into the input, and
 *    we cannot rely on `!isInvalid` because moment's forgiving parser "validates"
 *    them by matching a fragment and discarding the rest (producing garbage bounds).
 * 2. Otherwise derives re-parseable input text from the bounds: relative offsets
 *    are stripped of the `now` prefix (e.g. "-15m"), and absolute bounds are
 *    formatted as readable dates rather than raw ISO. Absolute bounds use full
 *    millisecond precision (not the display `timePrecision`), reproducing the
 *    bounds verbatim (rounding included) so that re-applying the text yields
 *    exactly the stored range — no unintended precision or rounding change.
 */
export declare function getOptionInputText(option: TimeRangeBoundsOption, options?: Pick<TimeRangeTransformOptions, 'locale'>): string;
/** Returns a new Date set to the start of the given day (00:00:00.000). */
export declare function getStartDate(date: Date): Date;
/** Returns a new Date set to the end of the given day (23:59:59.999). */
export declare function getEndDate(date: Date): Date;
/**
 * Formats a date range using the default DateRangePicker format with the standard delimiter.
 * e.g. "Mar 4, 2026, 10:00:00 - Mar 5, 2026, 23:30:00"
 *
 * Uses moment so the result respects Kibana's configured timezone.
 */
export declare function formatDateRange(start: Date, end: Date, precision?: TimePrecision): string;
/**
 * Finds the edit-input part that corresponds to a clicked idle-display part by
 * matching on `kind` and `rangeIndex` and preserving the part's ordinal position
 * within its peers.
 */
export declare function findCorrespondingInputPart(inputParts: RangePart[], displayPart: RangePart, displayParts: RangePart[]): RangePart | undefined;
/**
 * Computes the `scrollLeft` value that centers a character range within a single-line input.
 * Pass one offset to center on a caret position, or both to center on the midpoint of a range.
 * Uses canvas text measurement; falls back to a proportional estimate when 2d context is unavailable.
 */
export declare function getInputScrollLeftToCenter(input: HTMLInputElement, startOffset: number, endOffset?: number): number;
