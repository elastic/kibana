/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { RefObject } from 'react';

import type { TimeRange, TimeRangeBoundsOption, InitialFocus } from './types';
import { DATE_RANGE_INPUT_DELIMITER } from './constants';
import { textToTimeRange } from './parse';
import { dateMathToRelativeParts, timeRangeToDisplayText } from './format';

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
 * getOptionShorthand({ start: 'now-7d', end: 'now-1d' }) // "-7d to -1d"
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

  return `${startOffset} to ${endOffset}`;
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
