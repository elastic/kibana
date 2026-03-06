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
import {
  getScrollDirection,
  getMonthFromIndex,
  getTodayPosition,
  getScrollDirectionIcon,
  type ScrollDirection,
} from './calendar.utils';
import { TODAY_INDEX, MONTHS_TO_LOAD } from './calendar.constants';

const HALF_MONTHS_TO_LOAD = MONTHS_TO_LOAD / 2;

interface CalendarProps {
  range: DateRange | undefined;
  onRangeChange: (range: DateRange | undefined) => void;
}

export function Calendar({ range, onRangeChange }: CalendarProps) {
  const euiThemeContext = useEuiTheme();
  const styles = calendarStyles(euiThemeContext);

  const virtuosoRef = useRef<VirtuosoHandle>(null);

  const [scrollDirection, setScrollDirection] = useState<ScrollDirection>('none');
  const [firstItemIndex, setFirstItemIndex] = useState(TODAY_INDEX - HALF_MONTHS_TO_LOAD);
  const [totalCount, setTotalCount] = useState(MONTHS_TO_LOAD);

  const handleStartReached = useCallback(() => {
    setFirstItemIndex((prev) => prev - MONTHS_TO_LOAD);
    setTotalCount((prev) => prev + MONTHS_TO_LOAD);
  }, []);

  const handleEndReached = useCallback(() => {
    setTotalCount((prev) => prev + MONTHS_TO_LOAD);
  }, []);

  const handleRangeChanged = useCallback((visibleRange: ListRange) => {
    const direction = getScrollDirection(
      visibleRange.startIndex,
      visibleRange.endIndex,
      TODAY_INDEX
    );
    setScrollDirection(direction);
  }, []);

  const scrollToToday = useCallback(() => {
    virtuosoRef.current?.scrollToIndex({
      index: getTodayPosition(firstItemIndex, TODAY_INDEX),
      behavior: 'smooth',
      align: 'center',
    });
  }, [firstItemIndex]);

  const renderMonth = useCallback(
    (index: number) => {
      const month = getMonthFromIndex(index, TODAY_INDEX);
      return <CalendarView month={month} range={range} setRange={onRangeChange} />;
    },
    [range, onRangeChange]
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      virtuosoRef.current?.scrollToIndex({
        index: HALF_MONTHS_TO_LOAD,
        behavior: 'auto',
        align: 'center',
      });
    }, 0);

    return () => clearTimeout(timer);
  }, []);

  const iconType = getScrollDirectionIcon(scrollDirection);

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
          iconType={iconType}
          onClick={scrollToToday}
        >
          {calendarTexts.todayButton}
        </EuiButtonEmpty>
      )}
    </div>
  );
}
