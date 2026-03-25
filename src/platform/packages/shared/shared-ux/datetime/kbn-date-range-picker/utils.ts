/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { RefObject } from 'react';

import type {
  TimeRange,
  TimeRangeBoundsOption,
  InitialFocus,
  AutoRefreshIntervalUnit,
} from './types';
import { DATE_RANGE_INPUT_DELIMITER } from './constants';
import { textToTimeRange } from './parse';
import { dateMathToRelativeParts, timeRangeToDisplayText } from './format';
import { MS_PER } from './format/format_duration';

/**
 * Pads a non-negative integer component with leading zeros to `width` digits.
 *
 * @param n - The number to pad.
 * @param width - The width to pad to.
 *
 * @returns The padded number as a string.
 */
const pad = (n: number, width: number): string =>
  String(Math.max(0, Math.floor(n))).padStart(width, '0');

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
export function msToAutoRefreshInterval(
  intervalMs: number,
  unit?: AutoRefreshIntervalUnit
): { count: number; unit: AutoRefreshIntervalUnit } {
  if (intervalMs <= 0) {
    return { count: 0, unit: 's' };
  }

  if (unit === 'h') {
    return { count: Math.round(intervalMs / MS_PER.hour), unit: 'h' };
  }
  if (unit === 'm') {
    return { count: Math.round(intervalMs / MS_PER.minute), unit: 'm' };
  }
  if (unit === 's') {
    return { count: Math.round(intervalMs / MS_PER.second), unit: 's' };
  }

  if (intervalMs % MS_PER.hour === 0) {
    return { count: intervalMs / MS_PER.hour, unit: 'h' };
  }
  if (intervalMs % MS_PER.minute === 0) {
    return { count: intervalMs / MS_PER.minute, unit: 'm' };
  }
  if (intervalMs % MS_PER.second === 0) {
    return { count: intervalMs / MS_PER.second, unit: 's' };
  }

  return { count: Math.ceil(intervalMs / MS_PER.second), unit: 's' };
}

/**
 * Converts a count and unit to milliseconds.
 *
 * @param count - The count to convert to milliseconds.
 * @param unit - The unit to convert to milliseconds.
 *
 * @returns The milliseconds.
 */
export function autoRefreshIntervalToMs(count: number, unit: AutoRefreshIntervalUnit): number {
  switch (unit) {
    case 'h':
      return count * MS_PER.hour;
    case 'm':
      return count * MS_PER.minute;
    case 's':
    default:
      return count * MS_PER.second;
  }
}

/**
 * Formats total seconds as a realtime countdown for the toolbar (mm:ss, or hh:mm:ss when hours remain).
 *
 * @param totalSeconds - The total seconds to format.
 *
 * @returns The formatted countdown string.
 */
export function formatAutoRefreshCountdown(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) {
    return '00:00';
  }

  const s = Math.floor(totalSeconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;

  if (h > 0) {
    return `${pad(h, 2)}:${pad(m, 2)}:${pad(sec, 2)}`;
  }

  return `${pad(m, 2)}:${pad(sec, 2)}`;
}

/**
 * Ceil(ms → seconds) for auto-refresh timer and toolbar; non-negative and safe for invalid ms.
 * Matches `useAutoRefresh` tick length.
 *
 * @param intervalMs - The interval in milliseconds.
 *
 * @returns The total seconds.
 */
export function msToSeconds(intervalMs: number): number {
  if (!Number.isFinite(intervalMs) || intervalMs <= 0) {
    return 0;
  }

  return Math.ceil(intervalMs / MS_PER.second);
}

/**
 * Formats a Date as a local ISO-8601 string with full precision but no UTC offset ("Z").
 * e.g. a local 14:12:59.531 → "2026-03-04T14:12:59.531"
 *
 * Use this for display strings that should match what the user sees in their timezone,
 * rather than `.toISOString()` which always emits UTC.
 */
export function toLocalPreciseString(d: Date): string {
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1, 2)}-${pad(d.getDate(), 2)}` +
    `T${pad(d.getHours(), 2)}:${pad(d.getMinutes(), 2)}:${pad(d.getSeconds(), 2)}.${pad(
      d.getMilliseconds(),
      3
    )}`
  );
}

/**
 * Check a time range is valid
 */
export function isValidTimeRange(range: TimeRange): boolean {
  const { startDate, endDate } = range;
  // both dates are valid
  if (startDate === null || endDate === null) {
    return false;
  }
  // start must be before or equal to end
  return startDate.getTime() <= endDate.getTime();
}

/**
 * Resolve the `initialFocus` target within the panel.
 * A string is treated as a CSS selector; a ref as a direct element handle.
 * Falls back to the panel div itself when unset.
 */
export function resolveInitialFocus(
  panelRef: RefObject<HTMLElement>,
  initialFocus?: InitialFocus
): HTMLElement | null {
  if (typeof initialFocus === 'string') {
    return panelRef.current?.querySelector<HTMLElement>(initialFocus) ?? null;
  }
  if (initialFocus && 'current' in initialFocus) {
    return initialFocus.current;
  }
  return panelRef.current;
}

/**
 * Returns a human-readable display label for a time range option.
 * Uses the existing label when present, otherwise generates one using the same
 * pipeline as the control button: build text → parse → format.
 */
export function getOptionDisplayLabel(option: TimeRangeBoundsOption): string {
  if (option.label) return option.label;

  const text = `${option.start} ${DATE_RANGE_INPUT_DELIMITER} ${option.end}`;
  const timeRange = textToTimeRange(text);
  return timeRangeToDisplayText(timeRange);
}

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
export function getOptionShorthand(option: TimeRangeBoundsOption): string | null {
  const startOffset = boundToRelativeShorthand(option.start);
  const endOffset = boundToRelativeShorthand(option.end);

  if (startOffset === null || endOffset === null) return null;
  if (startOffset === 'now' && endOffset === 'now') return null;
  if (startOffset !== 'now' && startOffset.includes('/')) return null;
  if (endOffset !== 'now' && endOffset.includes('/')) return null;
  if (startOffset === 'now') return endOffset;
  if (endOffset === 'now') return startOffset;

  return `${startOffset} ${DATE_RANGE_INPUT_DELIMITER} ${endOffset}`;
}

/**
 * Determines the text to populate the input with when an option is selected.
 *
 * 1. If the option has a label that parses to a valid time range, returns it
 *    so natural-language input round-trips (e.g. "Last 15 minutes").
 * 2. Otherwise generates a user-friendly shorthand from the bounds, stripping
 *    the `now` prefix where possible (e.g. "-15m" instead of "now-15m").
 */
export function getOptionInputText(option: TimeRangeBoundsOption): string {
  if (option.label) {
    const parsed = textToTimeRange(option.label);
    if (!parsed.isInvalid) return option.label;
  }

  const startFragment = boundToInputFragment(option.start);
  const endFragment = boundToInputFragment(option.end);

  if (startFragment.isNow && endFragment.isNow) return 'now';
  if (startFragment.isNow) return endFragment.text;
  if (endFragment.isNow) return startFragment.text;

  return `${startFragment.text} ${DATE_RANGE_INPUT_DELIMITER} ${endFragment.text}`;
}

/**
 * Formats a date range as a local ISO-8601 string pair with the standard delimiter.
 * e.g. "2026-03-04T10:00:00.000 to 2026-03-05T23:30:00.000"
 */
export function formatDateRange(start: Date, end: Date): string {
  return `${toLocalPreciseString(start)} ${DATE_RANGE_INPUT_DELIMITER} ${toLocalPreciseString(
    end
  )}`;
}

/**
 * Parses a `HH:mm:ss.SSS` time string into its numeric components.
 */
function parseTimeString(time: string): [number, number, number, number] {
  const [hms, ms = '0'] = time.split('.');
  const [h = '0', m = '0', s = '0'] = hms.split(':');
  return [Number(h), Number(m), Number(s), Number(ms)];
}

/**
 * Combines date (year/month/day) from `date` with time from `timeSource`.
 * Falls back to `defaultTime` (`HH:mm:ss.SSS`) when timeSource is null.
 */
export function combineDateAndTime(
  date: Date,
  timeSource: Date | null,
  defaultTime = '00:00:00.000'
): Date {
  if (timeSource) {
    return new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      timeSource.getHours(),
      timeSource.getMinutes(),
      timeSource.getSeconds(),
      timeSource.getMilliseconds()
    );
  }

  const [h, m, s, ms] = parseTimeString(defaultTime);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), h, m, s, ms);
}

/**
 * Extracts the offset portion from a date math bound string, or
 * returns `null` for absolute dates and rounding-only expressions
 * that have no stable offset representation.
 *
 * - `"now"` → `"now"` (sentinel, not an offset)
 * - `"now-15m"` → `"-15m"`
 * - `"now+3d/d"` → `"+3d/d"`
 * - `"now/d"` → `null` (rounding only, no numeric offset)
 * - `"2025-01-01"` → `null`
 */
function boundToRelativeShorthand(bound: string): string | 'now' | null {
  if (bound === 'now') return 'now';

  const parts = dateMathToRelativeParts(bound);
  if (!parts) return null;

  const sign = parts.isFuture ? '+' : '-';
  const round = parts.round ? `/${parts.round}` : '';
  return `${sign}${parts.count}${parts.unit}${round}`;
}

/**
 * Converts a date math bound into a user-friendly input fragment.
 * Uses `boundToRelativeShorthand` to strip the `now` prefix when possible,
 * falling back to the original string for absolute dates and rounding-only expressions.
 */
function boundToInputFragment(bound: string): { text: string; isNow: boolean } {
  const shorthand = boundToRelativeShorthand(bound);
  if (shorthand === 'now') return { text: '', isNow: true };
  if (shorthand !== null) return { text: shorthand, isNow: false };
  return { text: bound, isNow: false };
}
