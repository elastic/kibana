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
export function getMonthInViewFocusTarget(scroller: HTMLElement): HTMLElement | null {
  const monthItems = Array.from(scroller.querySelectorAll<HTMLElement>('[data-month-index]'));
  const centerLine = scroller.scrollTop + scroller.clientHeight / 2;

  let monthInView: HTMLElement | null = null;
  let closestDistance = Number.POSITIVE_INFINITY;
  for (const monthItem of monthItems) {
    const monthTop = monthItem.offsetTop;
    const monthBottom = monthTop + monthItem.offsetHeight;
    const distance =
      centerLine < monthTop ? monthTop - centerLine : Math.max(0, centerLine - monthBottom);

    if (distance < closestDistance) {
      closestDistance = distance;
      monthInView = monthItem;
    }
  }

  return (
    monthInView?.querySelector<HTMLElement>('[tabindex="0"]') ??
    scroller.querySelector<HTMLElement>('[tabindex="0"]')
  );
}
