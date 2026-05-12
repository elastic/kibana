/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/** Date type for absolute dates (e.g. ISO 8601 strings, specific calendar dates) */
export const DATE_TYPE_ABSOLUTE = 'ABSOLUTE' as const;

/** Date type for relative dates expressed as offsets from now (e.g. "now-7d") */
export const DATE_TYPE_RELATIVE = 'RELATIVE' as const;

/** Date type representing the current moment ("now") */
export const DATE_TYPE_NOW = 'NOW' as const;

/** Default Moment.js format for displaying dates at full precision (e.g. "Feb 3, 2025, 14:30:07.801") */
export const DEFAULT_DATE_FORMAT = 'MMM D, YYYY, HH:mm:ss.SSS';

/** Time-only format at full precision, used when start and end fall on the same day */
export const DEFAULT_DATE_FORMAT_TIME_ONLY = 'HH:mm:ss.SSS';

/** Date format without year at full precision, used when start and end fall in the same year */
export const DEFAULT_DATE_FORMAT_NO_YEAR = 'MMM D, HH:mm:ss.SSS';

/** Delimiter between start and end when the user types a range (e.g. "-1d to now") */
export const DATE_RANGE_INPUT_DELIMITER = 'to';

/** Delimiter used in the display text between start and end (e.g. "Feb 3 → Feb 10") */
export const DATE_RANGE_DISPLAY_DELIMITER = '→';

/**
 * Maps date-math units to their display abbreviations.
 * Most units use the datemath symbol as-is; month uses "mo" instead of "M".
 */
export const UNIT_DISPLAY_ABBREV: Record<string, string> = {
  ms: 'ms',
  s: 's',
  m: 'm',
  h: 'h',
  d: 'd',
  w: 'w',
  M: 'mo',
  y: 'y',
};

/** Maps single-character date-math units to their full English names (e.g. "d" → "day") */
export const UNIT_SHORT_TO_FULL_MAP: Record<string, string> = {
  ms: 'millisecond',
  s: 'second',
  m: 'minute',
  h: 'hour',
  d: 'day',
  w: 'week',
  M: 'month',
  y: 'year',
};

/**
 * Maps each date-math offset unit to the unit used for rounding (`/X` suffix).
 *
 * Sub-day units promote one step up (`ms→s`, `s→m`, `m→h`), except `h→h`
 * which keeps the hour boundary. Day-and-above units all normalise to `/d`.
 */
export const ROUND_UNIT_MAP: Record<string, string> = {
  ms: 's',
  s: 'm',
  m: 'm',
  h: 'h',
  d: 'd',
  w: 'd',
  M: 'd',
  y: 'd',
};

/**
 * CSS selector for the infinite-scroll calendar scroller (`data-calendar-scroller` attribute in Calendar).
 */
export const CALENDAR_SCROLLER_SELECTOR = '[data-calendar-scroller]';

/** Selector for focusable elements */
export const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
