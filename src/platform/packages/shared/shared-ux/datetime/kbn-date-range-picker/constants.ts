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

/** Default Moment.js format for displaying dates (e.g. "Feb 3 2025, 14:30") */
export const DEFAULT_DATE_FORMAT = 'MMM D YYYY, HH:mm';

/** Time-only format, used when start and end fall on the same day (e.g. "14:30") */
export const FORMAT_TIME_ONLY = 'HH:mm';

/** Date format without year, used when start and end fall in the same year (e.g. "Feb 3, 14:30") */
export const FORMAT_NO_YEAR = 'MMM D, HH:mm';

/** Delimiter between start and end when the user types a range (e.g. "now-1d to now") */
export const DATE_RANGE_INPUT_DELIMITER = 'to';

/** Delimiter used in the display text between start and end (e.g. "Feb 3 → Feb 10") */
export const DATE_RANGE_DISPLAY_DELIMITER = '→';

/** Maps single-character date-math units to their full English names (e.g. "d" → "day") */
export const UNIT_SHORT_TO_FULL_MAP: Record<string, string> = {
  s: 'second',
  m: 'minute',
  h: 'hour',
  d: 'day',
  w: 'week',
  M: 'month',
  y: 'year',
};

/** Reverse of {@link UNIT_SHORT_TO_FULL_MAP}, also includes plural forms (e.g. "days" → "d") */
export const UNIT_FULL_TO_SHORT_MAP: Record<string, string> = Object.entries(
  UNIT_SHORT_TO_FULL_MAP
).reduce((acc, [short, full]) => {
  acc[full] = short;
  acc[`${full}s`] = short;
  return acc;
}, {} as Record<string, string>);

/** Selector for focusable elements */
export const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
