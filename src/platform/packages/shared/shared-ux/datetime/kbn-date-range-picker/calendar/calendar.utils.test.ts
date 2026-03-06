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
  getTodayPosition,
  getScrollDirectionIcon,
} from './calendar.utils';

const TODAY_INDEX = 100000;

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

  describe('getTodayPosition', () => {
    it('returns correct position when today is in the middle', () => {
      const firstItemIndex = TODAY_INDEX - 6;
      expect(getTodayPosition(firstItemIndex, TODAY_INDEX)).toBe(6);
    });

    it('returns 0 when firstItemIndex equals TODAY_INDEX', () => {
      expect(getTodayPosition(TODAY_INDEX, TODAY_INDEX)).toBe(0);
    });

    it('returns negative when today is before the loaded range', () => {
      const firstItemIndex = TODAY_INDEX + 5;
      expect(getTodayPosition(firstItemIndex, TODAY_INDEX)).toBe(-5);
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
});
