/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { EuiButtonEmpty, useEuiTheme } from '@elastic/eui';
import { Virtuoso, type VirtuosoHandle, type ListRange } from 'react-virtuoso';
import type { DateRange } from 'react-day-picker';

import { CalendarView } from './calendar_view';
import { calendarStyles } from './calendar.styles';
import { calendarTexts } from '../translations';

const MONTHS_TO_LOAD = 12;
const INITIAL_PAST_MONTHS = 50;
const INITIAL_FUTURE_MONTHS = 50;
/**
 * Base index representing "today" (current month).
 * Using a high value allows prepending past months without going negative.
 */
export const TODAY_INDEX = 100000;

/** Returns the first day of the current month, computed at call time. */
function getCurrentMonthStart(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

interface CalendarProps {
  range: DateRange | undefined;
  onRangeChange: (range: DateRange | undefined) => void;
}

export function Calendar({ range, onRangeChange }: CalendarProps) {
  const euiThemeContext = useEuiTheme();
  const styles = calendarStyles(euiThemeContext);
  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const isScrollingToTodayRef = useRef(false);
  const startDateRef = useRef<Date | null>(null);
  const initialRangeFromRef = useRef(range?.from);

  if (!startDateRef.current) {
    startDateRef.current = getCurrentMonthStart();
  }

  const [firstItemIndex, setFirstItemIndex] = useState(TODAY_INDEX - INITIAL_PAST_MONTHS);
  const [totalCount, setTotalCount] = useState(INITIAL_PAST_MONTHS + INITIAL_FUTURE_MONTHS);
  const [isTodayVisible, setIsTodayVisible] = useState(true);

  useEffect(() => {
    const from = initialRangeFromRef.current;
    if (!from) return;

    const startDate = startDateRef.current!;
    const monthOffset =
      (from.getFullYear() - startDate.getFullYear()) * 12 + from.getMonth() - startDate.getMonth();

    requestAnimationFrame(() => {
      virtuosoRef.current?.scrollToIndex({
        index: INITIAL_PAST_MONTHS + monthOffset,
        behavior: 'smooth',
        align: 'start',
      });
    });
  }, []);

  const handleStartReached = useCallback(() => {
    if (isScrollingToTodayRef.current) return;

    setFirstItemIndex((prev) => prev - MONTHS_TO_LOAD);
    setTotalCount((prev) => prev + MONTHS_TO_LOAD);
  }, []);

  const handleEndReached = useCallback(() => {
    if (isScrollingToTodayRef.current) return;

    setTotalCount((prev) => prev + MONTHS_TO_LOAD);
  }, []);

  const handleRangeChanged = useCallback((visibleRange: ListRange) => {
    const isTodayInVisibleRange =
      visibleRange.startIndex <= TODAY_INDEX && visibleRange.endIndex >= TODAY_INDEX;

    setIsTodayVisible(isTodayInVisibleRange);

    if (isTodayInVisibleRange && isScrollingToTodayRef.current) {
      isScrollingToTodayRef.current = false;
    }
  }, []);

  const scrollToToday = useCallback(() => {
    isScrollingToTodayRef.current = true;

    setTimeout(() => {
      isScrollingToTodayRef.current = false;
    }, 1500);

    virtuosoRef.current?.scrollToIndex({
      index: TODAY_INDEX - firstItemIndex,
      behavior: 'smooth',
      align: 'start',
    });
  }, [firstItemIndex]);

  const renderMonth = useCallback(
    (index: number) => {
      const startDate = startDateRef.current!;
      const monthOffset = index - TODAY_INDEX;
      const month = new Date(startDate.getFullYear(), startDate.getMonth() + monthOffset, 1);

      return <CalendarView month={month} range={range} setRange={onRangeChange} />;
    },
    [range, onRangeChange]
  );

  return (
    <div css={styles.container}>
      <Virtuoso
        ref={virtuosoRef}
        firstItemIndex={firstItemIndex}
        initialTopMostItemIndex={INITIAL_PAST_MONTHS}
        totalCount={totalCount}
        itemContent={renderMonth}
        startReached={handleStartReached}
        endReached={handleEndReached}
        rangeChanged={handleRangeChanged}
        overscan={2}
      />
      {!isTodayVisible && (
        <EuiButtonEmpty css={styles.todayButton} size="s" onClick={scrollToToday}>
          {calendarTexts.todayButton}
        </EuiButtonEmpty>
      )}
    </div>
  );
}
