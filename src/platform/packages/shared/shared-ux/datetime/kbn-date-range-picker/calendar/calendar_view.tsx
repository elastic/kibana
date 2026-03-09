/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo } from 'react';
import { DayPicker, type DateRange } from 'react-day-picker';
import { useEuiTheme } from '@elastic/eui';

import './calendar_view_base.css';
import { calendarViewStyles } from './calendar_view.styles';

interface CalendarViewProps {
  /** The year to display. */
  year: number;
  /** Zero-based month index to display. */
  monthIndex: number;
  /** The selected date range. */
  range: DateRange | undefined;
  /** Callback to update the selected range. */
  setRange: (range?: DateRange) => void;
  /**
   * First day of the week: 0 for Sunday, 1 for Monday.
   * @default 0
   */
  weekStartsOn?: 0 | 1;
}

/** Compares CalendarView props by value so the memo skips re-renders when only object identity changes. */
function areCalendarViewPropsEqual(prev: CalendarViewProps, next: CalendarViewProps): boolean {
  return (
    prev.year === next.year &&
    prev.monthIndex === next.monthIndex &&
    prev.weekStartsOn === next.weekStartsOn &&
    prev.setRange === next.setRange &&
    prev.range?.from?.getTime() === next.range?.from?.getTime() &&
    prev.range?.to?.getTime() === next.range?.to?.getTime()
  );
}

/**
 * Single-month calendar view backed by react-day-picker.
 * Memoized with a custom comparator to avoid re-rendering every visible
 * month when only the range object reference (not its timestamps) changes.
 */
export const CalendarView = React.memo(function CalendarView({
  year,
  monthIndex,
  range,
  setRange,
  weekStartsOn,
}: CalendarViewProps) {
  const euiThemeContext = useEuiTheme();
  const styles = calendarViewStyles(euiThemeContext);
  const month = useMemo(() => new Date(year, monthIndex, 1), [year, monthIndex]);

  return (
    <DayPicker
      css={styles.dayPicker}
      disableNavigation
      hideNavigation
      mode="range"
      month={month}
      onSelect={setRange}
      required={false}
      selected={range}
      weekStartsOn={weekStartsOn}
    />
  );
},
areCalendarViewPropsEqual);
