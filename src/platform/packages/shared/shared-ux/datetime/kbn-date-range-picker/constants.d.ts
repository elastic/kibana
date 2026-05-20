/** Date type for absolute dates (e.g. ISO 8601 strings, specific calendar dates) */
export declare const DATE_TYPE_ABSOLUTE: "ABSOLUTE";
/** Date type for relative dates expressed as offsets from now (e.g. "now-7d") */
export declare const DATE_TYPE_RELATIVE: "RELATIVE";
/** Date type representing the current moment ("now") */
export declare const DATE_TYPE_NOW: "NOW";
/** Default Moment.js format for displaying dates at full precision (e.g. "Feb 3, 2025, 14:30:07.801") */
export declare const DEFAULT_DATE_FORMAT = "MMM D, YYYY, HH:mm:ss.SSS";
/** Time-only format at full precision, used when start and end fall on the same day */
export declare const DEFAULT_DATE_FORMAT_TIME_ONLY = "HH:mm:ss.SSS";
/** Date format without year at full precision, used when start and end fall in the same year */
export declare const DEFAULT_DATE_FORMAT_NO_YEAR = "MMM D, HH:mm:ss.SSS";
/** Delimiter between start and end when the user types a range (e.g. "-1d to now") */
export declare const DATE_RANGE_INPUT_DELIMITER = "to";
/** Delimiter used in the display text between start and end (e.g. "Feb 3 → Feb 10") */
export declare const DATE_RANGE_DISPLAY_DELIMITER = "\u2192";
/**
 * Maps date-math units to their display abbreviations.
 * Most units use the datemath symbol as-is; month uses "mo" instead of "M".
 */
export declare const UNIT_DISPLAY_ABBREV: Record<string, string>;
/** Maps single-character date-math units to their full English names (e.g. "d" → "day") */
export declare const UNIT_SHORT_TO_FULL_MAP: Record<string, string>;
/**
 * Maps each date-math offset unit to the unit used for rounding (`/X` suffix).
 *
 * Sub-day units promote one step up (`ms→s`, `s→m`, `m→h`), except `h→h`
 * which keeps the hour boundary. Day-and-above units all normalise to `/d`.
 */
export declare const ROUND_UNIT_MAP: Record<string, string>;
/**
 * CSS selector for the infinite-scroll calendar scroller (`data-calendar-scroller` attribute in Calendar).
 */
export declare const CALENDAR_SCROLLER_SELECTOR = "[data-calendar-scroller]";
/** Selector for focusable elements */
export declare const FOCUSABLE_SELECTOR = "a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex=\"-1\"])";
