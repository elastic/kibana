/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  getScrollDirection,
  getMonthFromIndex,
  getIndexFromDate,
  getScrollDirectionIcon,
  getMonthInViewFocusTarget,
} from './calendar.utils';
import { TODAY_INDEX } from './calendar.constants';

describe('Calendar utility functions', () => {
  describe('getScrollDirection', () => {
    it('returns "forward" when all visible months are in the past', () => {
      expect(getScrollDirection(99990, 99995, TODAY_INDEX)).toBe('forward');
    });

    it('returns "backward" when all visible months are in the future', () => {
      expect(getScrollDirection(100005, 100010, TODAY_INDEX)).toBe('backward');
    });

    it('returns "none" when today is within the visible range', () => {
      expect(getScrollDirection(99999, 100001, TODAY_INDEX)).toBe('none');
    });

    it('returns "none" when today is exactly at startIndex', () => {
      expect(getScrollDirection(100000, 100005, TODAY_INDEX)).toBe('none');
    });

    it('returns "none" when today is exactly at endIndex', () => {
      expect(getScrollDirection(99995, 100000, TODAY_INDEX)).toBe('none');
    });

    it('returns "forward" when endIndex is one less than today', () => {
      expect(getScrollDirection(99990, 99999, TODAY_INDEX)).toBe('forward');
    });

    it('returns "backward" when startIndex is one more than today', () => {
      expect(getScrollDirection(100001, 100010, TODAY_INDEX)).toBe('backward');
    });
  });

  describe('getMonthFromIndex', () => {
    const referenceDate = new Date(2026, 2, 15); // March 2026

    it('returns the reference month for TODAY_INDEX', () => {
      const result = getMonthFromIndex(TODAY_INDEX, TODAY_INDEX, referenceDate);
      expect(result.getFullYear()).toBe(2026);
      expect(result.getMonth()).toBe(2); // March
      expect(result.getDate()).toBe(1);
    });

    it('returns previous month for TODAY_INDEX - 1', () => {
      const result = getMonthFromIndex(TODAY_INDEX - 1, TODAY_INDEX, referenceDate);
      expect(result.getFullYear()).toBe(2026);
      expect(result.getMonth()).toBe(1); // February
    });

    it('returns next month for TODAY_INDEX + 1', () => {
      const result = getMonthFromIndex(TODAY_INDEX + 1, TODAY_INDEX, referenceDate);
      expect(result.getFullYear()).toBe(2026);
      expect(result.getMonth()).toBe(3); // April
    });

    it('handles year rollover backward (January to December)', () => {
      const januaryRef = new Date(2026, 0, 15); // January 2026
      const result = getMonthFromIndex(TODAY_INDEX - 1, TODAY_INDEX, januaryRef);
      expect(result.getFullYear()).toBe(2025);
      expect(result.getMonth()).toBe(11); // December
    });

    it('handles year rollover forward (December to January)', () => {
      const decemberRef = new Date(2026, 11, 15); // December 2026
      const result = getMonthFromIndex(TODAY_INDEX + 1, TODAY_INDEX, decemberRef);
      expect(result.getFullYear()).toBe(2027);
      expect(result.getMonth()).toBe(0); // January
    });

    it('handles large offsets correctly', () => {
      const result = getMonthFromIndex(TODAY_INDEX - 24, TODAY_INDEX, referenceDate);
      expect(result.getFullYear()).toBe(2024);
      expect(result.getMonth()).toBe(2); // March, 2 years ago
    });
  });

  describe('getIndexFromDate', () => {
    const referenceDate = new Date(2026, 2, 15); // March 2026

    it('returns TODAY_INDEX for the same month as reference', () => {
      const sameMonth = new Date(2026, 2, 1);
      expect(getIndexFromDate(sameMonth, TODAY_INDEX, referenceDate)).toBe(TODAY_INDEX);
    });

    it('returns TODAY_INDEX - 1 for previous month', () => {
      const prevMonth = new Date(2026, 1, 15); // February 2026
      expect(getIndexFromDate(prevMonth, TODAY_INDEX, referenceDate)).toBe(TODAY_INDEX - 1);
    });

    it('returns TODAY_INDEX + 1 for next month', () => {
      const nextMonth = new Date(2026, 3, 10); // April 2026
      expect(getIndexFromDate(nextMonth, TODAY_INDEX, referenceDate)).toBe(TODAY_INDEX + 1);
    });

    it('handles year differences correctly', () => {
      const twoYearsAgo = new Date(2024, 2, 15); // March 2024
      expect(getIndexFromDate(twoYearsAgo, TODAY_INDEX, referenceDate)).toBe(TODAY_INDEX - 24);
    });

    it('is inverse of getMonthFromIndex', () => {
      const index = TODAY_INDEX - 5;
      const month = getMonthFromIndex(index, TODAY_INDEX, referenceDate);
      expect(getIndexFromDate(month, TODAY_INDEX, referenceDate)).toBe(index);
    });
  });

  describe('getScrollDirectionIcon', () => {
    it('returns "sortUp" for backward direction', () => {
      expect(getScrollDirectionIcon('backward')).toBe('sortUp');
    });

    it('returns "sortDown" for forward direction', () => {
      expect(getScrollDirectionIcon('forward')).toBe('sortDown');
    });

    it('returns undefined for none direction', () => {
      expect(getScrollDirectionIcon('none')).toBeUndefined();
    });
  });

  describe('getMonthInViewFocusTarget', () => {
    const MONTH_HEIGHT = 280;
    const MONTH_GAP = 20;

    interface ScrollerOptions {
      monthCount: number;
      scrollTop: number;
      clientHeight: number;
      /** Month indices whose day button gets `tabindex="0"`; others get -1. */
      tabbableMonths?: number[];
    }

    function buildScroller({
      monthCount,
      scrollTop,
      clientHeight,
      tabbableMonths = Array.from({ length: monthCount }, (_, index) => index),
    }: ScrollerOptions): HTMLElement {
      const scroller = document.createElement('div');
      Object.defineProperty(scroller, 'scrollTop', { configurable: true, get: () => scrollTop });
      Object.defineProperty(scroller, 'clientHeight', {
        configurable: true,
        get: () => clientHeight,
      });

      for (let index = 0; index < monthCount; index++) {
        const monthItem = document.createElement('div');
        monthItem.setAttribute('data-month-index', String(index));
        Object.defineProperty(monthItem, 'offsetTop', {
          configurable: true,
          get: () => index * (MONTH_HEIGHT + MONTH_GAP),
        });
        Object.defineProperty(monthItem, 'offsetHeight', {
          configurable: true,
          get: () => MONTH_HEIGHT,
        });

        const dayButton = document.createElement('button');
        dayButton.setAttribute('tabindex', tabbableMonths.includes(index) ? '0' : '-1');
        dayButton.setAttribute('data-day-of-month', String(index));
        monthItem.appendChild(dayButton);
        scroller.appendChild(monthItem);
      }

      return scroller;
    }

    it('returns the tabindex=0 day of the month containing the viewport centerline', () => {
      const scroller = buildScroller({
        monthCount: 5,
        // Centerline at 2 * (280 + 20) + 140 = 740, inside month 2.
        scrollTop: 2 * (MONTH_HEIGHT + MONTH_GAP),
        clientHeight: MONTH_HEIGHT,
      });

      const target = getMonthInViewFocusTarget(scroller);

      expect(target?.getAttribute('data-day-of-month')).toBe('2');
    });

    it('picks the nearest month when the centerline falls between month items', () => {
      const scroller = buildScroller({
        monthCount: 5,
        // Centerline at 280 + 5 = 285, in the gap after month 0 but closer to it
        // (month 1 starts at 300).
        scrollTop: 145,
        clientHeight: MONTH_HEIGHT,
      });

      const target = getMonthInViewFocusTarget(scroller);

      expect(target?.getAttribute('data-day-of-month')).toBe('0');
    });

    it('falls back to the scroller-wide tabindex=0 when the month in view has none', () => {
      const scroller = buildScroller({
        monthCount: 5,
        scrollTop: 2 * (MONTH_HEIGHT + MONTH_GAP),
        clientHeight: MONTH_HEIGHT,
        tabbableMonths: [4],
      });

      const target = getMonthInViewFocusTarget(scroller);

      expect(target?.getAttribute('data-day-of-month')).toBe('4');
    });

    it('falls back to the scroller-wide tabindex=0 when there are no month items', () => {
      const scroller = document.createElement('div');
      const dayButton = document.createElement('button');
      dayButton.setAttribute('tabindex', '0');
      scroller.appendChild(dayButton);

      expect(getMonthInViewFocusTarget(scroller)).toBe(dayButton);
    });

    it('returns null when nothing is tabbable', () => {
      const scroller = buildScroller({
        monthCount: 3,
        scrollTop: 0,
        clientHeight: MONTH_HEIGHT,
        tabbableMonths: [],
      });

      expect(getMonthInViewFocusTarget(scroller)).toBeNull();
    });
  });
});
