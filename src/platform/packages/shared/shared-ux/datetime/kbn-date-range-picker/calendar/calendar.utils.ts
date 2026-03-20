/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export type ScrollDirection = 'forward' | 'backward' | 'none';

/**
 * Determines scroll direction relative to today's month.
 * - 'forward': viewing past months, need to scroll forward to reach today
 * - 'backward': viewing future months, need to scroll backward to reach today
 * - 'none': today is visible in the current range
 */
export function getScrollDirection(
  startIndex: number,
  endIndex: number,
  todayIndex: number
): ScrollDirection {
  if (endIndex < todayIndex) return 'forward';
  if (startIndex > todayIndex) return 'backward';
  return 'none';
}

/**
 * Converts a virtual index to the corresponding month Date.
 * Index equal to `todayIndex` returns the current month.
 */
export function getMonthFromIndex(index: number, todayIndex: number, referenceDate?: Date): Date {
  const today = referenceDate ?? new Date();
  return new Date(today.getFullYear(), today.getMonth() + (index - todayIndex), 1);
}

/**
 * Converts a date to its corresponding virtual index.
 * Inverse of `getMonthFromIndex`.
 */
export function getIndexFromDate(date: Date, todayIndex: number, referenceDate?: Date): number {
  const today = referenceDate ?? new Date();
  const monthDiff =
    (date.getFullYear() - today.getFullYear()) * 12 + (date.getMonth() - today.getMonth());
  return todayIndex + monthDiff;
}

/**
 * Returns the icon type for the Today button based on scroll direction.
 */
export function getScrollDirectionIcon(
  direction: ScrollDirection
): 'sortUp' | 'sortDown' | undefined {
  if (direction === 'backward') return 'sortUp';
  if (direction === 'forward') return 'sortDown';
  return undefined;
}
