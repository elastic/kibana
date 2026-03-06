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
/**
 * Base index representing "today" (current month).
 * Using a high value allows prepending past months without going negative.
 * Technically, negative indices will work but will also trigger a Virtuoso console warning.
 */
export const TODAY_INDEX = 100000;

export type ScrollDirection = 'forward' | 'backward' | 'none';

interface CalendarProps {
  range: DateRange | undefined;
  onRangeChange: (range: DateRange | undefined) => void;
}

export function Calendar({ range, onRangeChange }: CalendarProps) {
  const euiThemeContext = useEuiTheme();
  const styles = calendarStyles(euiThemeContext);

  const virtuosoRef = useRef<VirtuosoHandle>(null);

  const [scrollDirection, setScrollDirection] = useState<ScrollDirection>('none');
  const [firstItemIndex, setFirstItemIndex] = useState(TODAY_INDEX - MONTHS_TO_LOAD / 2);
  const [totalCount, setTotalCount] = useState(MONTHS_TO_LOAD);

  // Prepend MONTHS_TO_LOAD months
  const handleStartReached = useCallback(() => {
    setFirstItemIndex((prev) => prev - MONTHS_TO_LOAD);
    setTotalCount((prev) => prev + MONTHS_TO_LOAD);
  }, []);

  // Append MONTHS_TO_LOAD months
  const handleEndReached = useCallback(() => {
    setTotalCount((prev) => prev + MONTHS_TO_LOAD);
  }, []);

  const handleRangeChanged = useCallback((visibleRange: ListRange) => {
    const { startIndex, endIndex } = visibleRange;
    const hasScrolledIntoFuture = endIndex < TODAY_INDEX;
    const hasScrolledIntoPast = startIndex > TODAY_INDEX;

    if (hasScrolledIntoFuture) {
      setScrollDirection('forward');
    } else if (hasScrolledIntoPast) {
      setScrollDirection('backward');
    } else {
      setScrollDirection('none');
    }
  }, []);

  const scrollToToday = useCallback(() => {
    virtuosoRef.current?.scrollToIndex({
      index: TODAY_INDEX - firstItemIndex,
      behavior: 'smooth',
      align: 'center',
    });
  }, [firstItemIndex]);

  const renderMonth = useCallback(
    (index: number) => {
      const today = new Date();
      const month = new Date(today.getFullYear(), today.getMonth() + (index - TODAY_INDEX), 1);
      return <CalendarView month={month} range={range} setRange={onRangeChange} />;
    },
    [range, onRangeChange]
  );

  // Scroll current month into center on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      virtuosoRef.current?.scrollToIndex({
        index: MONTHS_TO_LOAD / 2,
        behavior: 'auto',
        align: 'center',
      });
    }, 0);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div css={styles.container}>
      <Virtuoso
        ref={virtuosoRef}
        firstItemIndex={firstItemIndex}
        totalCount={totalCount}
        itemContent={renderMonth}
        startReached={handleStartReached}
        endReached={handleEndReached}
        rangeChanged={handleRangeChanged}
        overscan={2}
      />
      {scrollDirection !== 'none' && (
        <EuiButtonEmpty
          css={styles.todayButton}
          size="s"
          iconType={
            scrollDirection === 'backward'
              ? 'sortUp'
              : scrollDirection === 'forward'
              ? 'sortDown'
              : undefined
          }
          onClick={scrollToToday}
        >
          {calendarTexts.todayButton}
        </EuiButtonEmpty>
      )}
    </div>
  );
}
