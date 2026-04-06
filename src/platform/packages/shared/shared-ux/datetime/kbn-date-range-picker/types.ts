/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { RefObject } from 'react';

import type { DATE_TYPE_ABSOLUTE, DATE_TYPE_RELATIVE, DATE_TYPE_NOW } from './constants';

export type DateType = typeof DATE_TYPE_ABSOLUTE | typeof DATE_TYPE_RELATIVE | typeof DATE_TYPE_NOW;

/** Canonical date-math time units */
export type TimeUnit = 'ms' | 's' | 'm' | 'h' | 'd' | 'w' | 'M' | 'y';

/** Structured offset extracted from a relative date-math string like `now-7d/d` */
export interface DateOffset {
  /** Signed offset. Negative = past, positive = future. */
  count: number;
  /** Time unit for the offset */
  unit: TimeUnit;
  /** Optional rounding unit (the `/d` in `now-1d/d`) */
  roundTo?: TimeUnit;
}

/** Elastic dataMath string or ISO 8601 yyyy-MM-ddTHH:mm:ss.SSSZ e.g. 2025-12-23T08:15:13Z */
export type DateString = string;

/**
 * Determines which element receives focus when ArrowDown is pressed from the input.
 * A string is treated as a CSS selector resolved against the panel; a ref points
 * to the element directly. When unset, defaults to the panel div itself.
 */
export type InitialFocus = RefObject<HTMLElement | null> | string;

export interface TimeRangeBounds {
  end: DateString;
  start: DateString;
}

/** Used for presets and recent options */
export interface TimeRangeBoundsOption extends TimeRangeBounds {
  label?: string;
}

/** Calendar-specific configuration options. */
export interface CalendarOptions {
  /**
   * First day of the week: 0 for Sunday, 1 for Monday.
   * @default 0
   */
  firstDayOfWeek?: 0 | 1;
}

export interface TimeRangeTransformOptions {
  presets?: TimeRangeBoundsOption[];
  /** Additional accepted delimiter (on top of the built-in `'to'`, `'until'`, and `'-'`) */
  delimiter?: string;
  /**
   * Additional format string for parsing absolute dates.
   * Prepended to built-in formats so the parser recognises custom-formatted input.
   * Does not affect how dates are displayed.
   */
  dateFormat?: string;
  /**
   * Controls rounding of the start bound for relative time ranges.
   * Only affects relative `start` bounds (strings containing `now`);
   * future ranges where start is bare `now` are unaffected.
   * - `true`: keep existing rounding; if absent, infer it from the offset
   *   unit (`/d` for day-and-above, next-unit-up for sub-day units).
   * - `false`: strip any rounding suffix.
   * - `undefined`: leave the start string as-is.
   * @default undefined
   */
  roundRelativeTime?: boolean;
  /**
   * Sub-minute precision applied when formatting absolute timestamps.
   * @default 's'
   */
  timePrecision?: TimePrecision;
}

/** Time unit for the auto-refresh interval. */
export type AutoRefreshIntervalUnit = 's' | 'm' | 'h';

/** Auto-refresh configuration stored in picker settings. */
export interface AutoRefreshSettings {
  /**
   * When true, shows the play/pause button and allows the timer to run (controlled with `isPaused`).
   * Toggled from Settings, not from the append control.
   */
  isEnabled: boolean;
  /**
   * When `isEnabled` is true, whether the refresh interval timer is running (`false`) or paused (`true`).
   */
  isPaused: boolean;
  /**
   * Refresh interval in milliseconds.
   * @default 10000
   */
  interval: number;
  /**
   * The unit used to display the interval count in the Settings panel.
   * Auto-determined from `interval` when absent.
   */
  intervalUnit?: AutoRefreshIntervalUnit;
}

/** Controls sub-minute precision shown in absolute timestamps. */
export type TimePrecision = 's' | 'ms' | 'none';

/** User-facing settings exposed by the date range picker settings panel. */
export interface DateRangePickerSettings {
  /**
   * When true, relative time ranges round to the nearest full unit
   * (e.g. minute, hour, day).
   * @default true
   */
  roundRelativeTime: boolean;
  /**
   * Controls sub-minute precision shown in absolute timestamps.
   * - `'s'` — show seconds (default behaviour when omitted).
   * - `'ms'` — show seconds and milliseconds.
   * - `'none'` — show only hours and minutes.
   *
   * When set, a toggle is shown in the Settings panel. When omitted the
   * toggle is hidden and seconds are shown by default.
   */
  timePrecision?: TimePrecision;
  /**
   * Auto-refresh preferences. The Settings “Refresh every” row and the toolbar play/pause control
   * are shown only when both this and `DateRangePickerProps.onRefresh` are set.
   */
  autoRefresh?: AutoRefreshSettings;
}

export interface TimeRange {
  value: string;
  start: DateString;
  end: DateString;
  startDate: Date | null;
  endDate: Date | null;
  type: [DateType, DateType];
  isNaturalLanguage: boolean;
  isInvalid: boolean;
  /** Non-null only when the start bound is RELATIVE */
  startOffset: DateOffset | null;
  /** Non-null only when the end bound is RELATIVE */
  endOffset: DateOffset | null;
}
