/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState, useCallback, useRef } from 'react';
import { EuiButtonEmpty, useEuiTheme } from '@elastic/eui';
import { Virtuoso, type VirtuosoHandle, type ListRange } from 'react-virtuoso';
import type { DateRange } from 'react-day-picker';

import { CalendarView } from './calendar_view';
import { calendarStyles } from './calendar.styles';

const START_DATE = (() => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
})();
const MONTHS_TO_LOAD = 12;
const INITIAL_PAST_MONTHS = 50;
const INITIAL_FUTURE_MONTHS = 50;

interface CalendarProps {
  range: DateRange | undefined;
  onRangeChange: (range: DateRange | undefined) => void;
}

export function Calendar({ range, onRangeChange }: CalendarProps) {
  const euiThemeContext = useEuiTheme();
  const styles = calendarStyles(euiThemeContext);
  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const isScrollingToTodayRef = useRef(false);
  const firstItemIndexRef = useRef(-INITIAL_PAST_MONTHS);

  const [firstItemIndex, setFirstItemIndex] = useState(-INITIAL_PAST_MONTHS);
  const [totalCount, setTotalCount] = useState(INITIAL_PAST_MONTHS + INITIAL_FUTURE_MONTHS);
  const [isTodayVisible, setIsTodayVisible] = useState(true);

  const getTodayArrayIndex = () => 0 - firstItemIndexRef.current;

  const handleStartReached = useCallback(() => {
    if (isScrollingToTodayRef.current) return;
    setFirstItemIndex((prev) => {
      const next = prev - MONTHS_TO_LOAD;
      firstItemIndexRef.current = next;
      return next;
    });
    setTotalCount((prev) => prev + MONTHS_TO_LOAD);
  }, []);

  const handleEndReached = useCallback(() => {
    if (isScrollingToTodayRef.current) return;
    setTotalCount((prev) => prev + MONTHS_TO_LOAD);
  }, []);

  const handleRangeChanged = useCallback((visibleRange: ListRange) => {
    const todayArrayIndex = getTodayArrayIndex();
    const todayVisibleByArrayIndex =
      visibleRange.startIndex <= todayArrayIndex && visibleRange.endIndex >= todayArrayIndex;
    const todayVisibleByMonthOffset = visibleRange.startIndex <= 0 && visibleRange.endIndex >= 0;
    const todayVisible = todayVisibleByArrayIndex || todayVisibleByMonthOffset;
    setIsTodayVisible(todayVisible);
    if (todayVisible && isScrollingToTodayRef.current) {
      isScrollingToTodayRef.current = false;
    }
  }, []);

  const scrollToToday = useCallback(() => {
    isScrollingToTodayRef.current = true;
    virtuosoRef.current?.scrollToIndex({
      index: getTodayArrayIndex(),
      behavior: 'smooth',
      align: 'start',
    });
  }, []);

  const renderMonth = (index: number) => {
    const month = new Date(START_DATE.getFullYear(), START_DATE.getMonth() + index, 1);
    return (
      <CalendarView month={month} range={range} setRange={onRangeChange} />
    );
  };

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
          Today
        </EuiButtonEmpty>
      )}
    </div>
  );
}
