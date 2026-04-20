/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, {
  useState,
  useCallback,
  useRef,
  useMemo,
  useLayoutEffect,
  type KeyboardEvent,
} from 'react';
import { EuiButtonEmpty, keys } from '@elastic/eui';
import type { DateRange } from 'react-day-picker';

import { CalendarView } from './calendar_view';
import { useCalendarStyles } from './calendar.styles';
import { calendarTexts } from '../translations';
import {
  getScrollDirection,
  getMonthFromIndex,
  getIndexFromDate,
  getScrollDirectionIcon,
  type ScrollDirection,
} from './calendar.utils';
import {
  TODAY_INDEX,
  CALENDAR_WINDOW_MONTHS,
  HALF_CALENDAR_WINDOW_MONTHS,
  CALENDAR_SHIFT_MONTHS,
  CALENDAR_SCROLL_EDGE_THRESHOLD,
} from './calendar.constants';

interface CalendarProps {
  /** The selected date range. */
  range: DateRange | undefined;
  /** Callback when the user changes the selected range. */
  onRangeChange: (range: DateRange | undefined) => void;
  /**
   * First day of the week: 0 for Sunday, 1 for Monday.
   * @default 0
   */
  firstDayOfWeek?: 0 | 1;
}

interface ScrollAnchor {
  monthIndex: number;
  offsetFromViewportTop: number;
}

/** Infinite-like month calendar using a fixed window with chunked prepend/append. */
export function Calendar({ range, onRangeChange, firstDayOfWeek }: CalendarProps) {
  const styles = useCalendarStyles();

  const scrollerRef = useRef<HTMLDivElement>(null);
  const pendingCenterIndexRef = useRef<number | null>(null);
  const pendingShiftAnchorRef = useRef<ScrollAnchor | null>(null);
  const hasCenteredInitiallyRef = useRef(false);
  const isShiftingWindowRef = useRef(false);
  const initialTargetIndexRef = useRef(
    range?.from ? getIndexFromDate(range.from, TODAY_INDEX) : TODAY_INDEX
  );

  const onRangeChangeRef = useRef(onRangeChange);
  onRangeChangeRef.current = onRangeChange;
  const stableOnRangeChange = useCallback(
    (newRange: DateRange | undefined) => onRangeChangeRef.current(newRange),
    []
  );

  const [windowStartIndex, setWindowStartIndex] = useState(
    () => initialTargetIndexRef.current - HALF_CALENDAR_WINDOW_MONTHS
  );

  const [scrollDirection, setScrollDirection] = useState<ScrollDirection>('none');

  const updateScrollDirection = useCallback(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    const monthItems = Array.from(scroller.querySelectorAll<HTMLElement>('[data-month-index]'));
    if (monthItems.length === 0) return;

    const viewportTop = scroller.scrollTop;
    const viewportBottom = viewportTop + scroller.clientHeight;
    let startIndex = Number.POSITIVE_INFINITY;
    let endIndex = Number.NEGATIVE_INFINITY;

    for (const monthItem of monthItems) {
      const monthIndex = Number(monthItem.dataset.monthIndex);
      if (Number.isNaN(monthIndex)) continue;

      const monthTop = monthItem.offsetTop;
      const monthBottom = monthTop + monthItem.offsetHeight;
      if (monthBottom < viewportTop || monthTop > viewportBottom) continue;

      startIndex = Math.min(startIndex, monthIndex);
      endIndex = Math.max(endIndex, monthIndex);
    }

    const visibleRange =
      startIndex === Number.POSITIVE_INFINITY || endIndex === Number.NEGATIVE_INFINITY
        ? {
            startIndex: windowStartIndex,
            endIndex: windowStartIndex + CALENDAR_WINDOW_MONTHS - 1,
          }
        : { startIndex, endIndex };

    const direction = getScrollDirection(
      visibleRange.startIndex,
      visibleRange.endIndex,
      TODAY_INDEX
    );
    setScrollDirection(direction);
  }, [windowStartIndex]);

  const centerMonth = useCallback(
    (targetIndex: number) => {
      const scroller = scrollerRef.current;
      if (!scroller) return;

      const targetItem = scroller.querySelector<HTMLElement>(
        `[data-month-index="${String(targetIndex)}"]`
      );
      if (!targetItem) return;

      const centeredTop =
        targetItem.offsetTop - (scroller.clientHeight - targetItem.offsetHeight) / 2;
      const nextTop = Math.max(0, centeredTop);
      if (typeof scroller.scrollTo === 'function') {
        scroller.scrollTo({ top: nextTop, behavior: 'auto' });
      } else {
        scroller.scrollTop = nextTop;
      }
      updateScrollDirection();
    },
    [updateScrollDirection]
  );

  const shiftWindow = useCallback((direction: Exclude<ScrollDirection, 'none'>) => {
    const scroller = scrollerRef.current;
    if (!scroller || isShiftingWindowRef.current) return;

    const monthItems = Array.from(scroller.querySelectorAll<HTMLElement>('[data-month-index]'));
    if (monthItems.length < CALENDAR_SHIFT_MONTHS) return;

    const scrollTop = scroller.scrollTop;
    const anchorItem =
      monthItems.find((monthItem) => monthItem.offsetTop + monthItem.offsetHeight > scrollTop) ??
      monthItems[0];
    const anchorMonthIndex = Number(anchorItem?.dataset.monthIndex);
    if (!anchorItem || Number.isNaN(anchorMonthIndex)) return;

    isShiftingWindowRef.current = true;
    pendingShiftAnchorRef.current = {
      monthIndex: anchorMonthIndex,
      offsetFromViewportTop: anchorItem.offsetTop - scrollTop,
    };

    if (direction === 'backward') {
      // Prepend older months.
      setWindowStartIndex((prev) => prev - CALENDAR_SHIFT_MONTHS);
      return;
    }

    // Drop oldest months and append newer months.
    setWindowStartIndex((prev) => prev + CALENDAR_SHIFT_MONTHS);
  }, []);

  const handleScroll = useCallback(() => {
    const scroller = scrollerRef.current;
    if (!scroller || isShiftingWindowRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = scroller;
    if (scrollTop <= CALENDAR_SCROLL_EDGE_THRESHOLD) {
      shiftWindow('backward');
      return;
    }

    if (scrollTop + clientHeight >= scrollHeight - CALENDAR_SCROLL_EDGE_THRESHOLD) {
      shiftWindow('forward');
      return;
    }

    updateScrollDirection();
  }, [shiftWindow, updateScrollDirection]);

  const scrollToMonth = useCallback(
    (targetIndex: number) => {
      const windowEndIndex = windowStartIndex + CALENDAR_WINDOW_MONTHS - 1;
      if (targetIndex < windowStartIndex || targetIndex > windowEndIndex) {
        pendingCenterIndexRef.current = targetIndex;
        setWindowStartIndex(targetIndex - HALF_CALENDAR_WINDOW_MONTHS);
        return;
      }

      centerMonth(targetIndex);
    },
    [centerMonth, windowStartIndex]
  );

  const scrollToToday = useCallback(() => {
    scrollToMonth(TODAY_INDEX);
  }, [scrollToMonth]);

  /**
   * Capture-phase handler for Page Up/Down month navigation.
   *
   * Uses capture because react-day-picker calls `stopPropagation` on those keys in its own
   * grid handler, so a bubble-phase listener would never fire. Each react-day-picker
   * instance has a controlled `month` prop and cannot navigate on its own, so
   * we move focus to the same day number in the adjacent month ourselves.
   */
  const onScrollerKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.key !== keys.PAGE_DOWN && event.key !== keys.PAGE_UP) return;

      const focused = document.activeElement;
      if (!(focused instanceof HTMLElement) || !event.currentTarget.contains(focused)) return;

      const monthItem = focused.closest<HTMLElement>('[data-month-index]');
      if (!monthItem) return;

      const currentIndex = Number(monthItem.dataset.monthIndex);
      if (Number.isNaN(currentIndex)) return;

      event.preventDefault();
      event.stopPropagation();

      const targetIndex = currentIndex + (event.key === keys.PAGE_DOWN ? 1 : -1);

      // Focus the same day number in the target month; fall back to its first enabled day.
      const dayText = focused.textContent?.trim() ?? '';
      const targetMonthItem = event.currentTarget.querySelector<HTMLElement>(
        `[data-month-index="${targetIndex}"]`
      );

      if (targetMonthItem) {
        const buttons = Array.from(
          targetMonthItem.querySelectorAll<HTMLElement>('button:not([disabled])')
        );
        const sameDay = buttons.find((btn) => btn.textContent?.trim() === dayText);
        (sameDay ?? buttons[0])?.focus();
      }

      scrollToMonth(targetIndex);
    },
    [scrollToMonth]
  );

  useLayoutEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    if (pendingShiftAnchorRef.current !== null) {
      const { monthIndex, offsetFromViewportTop } = pendingShiftAnchorRef.current;
      const nextAnchorItem = scroller.querySelector<HTMLElement>(
        `[data-month-index="${String(monthIndex)}"]`
      );
      if (nextAnchorItem) {
        scroller.scrollTop = Math.max(0, nextAnchorItem.offsetTop - offsetFromViewportTop);
      }
      pendingShiftAnchorRef.current = null;
      isShiftingWindowRef.current = false;
      updateScrollDirection();
      return;
    }

    if (pendingCenterIndexRef.current !== null) {
      const targetIndex = pendingCenterIndexRef.current;
      pendingCenterIndexRef.current = null;
      centerMonth(targetIndex);
      return;
    }

    if (!hasCenteredInitiallyRef.current) {
      hasCenteredInitiallyRef.current = true;
      centerMonth(initialTargetIndexRef.current);
      return;
    }

    updateScrollDirection();
  }, [centerMonth, updateScrollDirection, windowStartIndex]);

  const monthIndices = useMemo(
    () =>
      Array.from({ length: CALENDAR_WINDOW_MONTHS }, (_, index) => {
        return windowStartIndex + index;
      }),
    [windowStartIndex]
  );

  return (
    <div css={styles.container}>
      <div
        ref={scrollerRef}
        css={styles.scroller}
        role="group"
        aria-label={calendarTexts.scrollerAriaLabel}
        data-test-subj="dateRangePickerCalendarScroller"
        data-calendar-scroller
        onKeyDownCapture={onScrollerKeyDown}
        onScroll={handleScroll}
      >
        {monthIndices.map((index) => {
          const month = getMonthFromIndex(index, TODAY_INDEX);
          return (
            <div key={index} css={styles.monthItem} data-month-index={index}>
              <CalendarView
                year={month.getFullYear()}
                monthIndex={month.getMonth()}
                range={range}
                setRange={stableOnRangeChange}
                firstDayOfWeek={firstDayOfWeek}
              />
            </div>
          );
        })}
      </div>
      {scrollDirection !== 'none' && (
        <EuiButtonEmpty
          css={styles.todayButton}
          size="s"
          iconType={getScrollDirectionIcon(scrollDirection)}
          onClick={scrollToToday}
          data-test-subj="dateRangePickerCalendarTodayButton"
        >
          {calendarTexts.todayButton}
        </EuiButtonEmpty>
      )}
    </div>
  );
}
