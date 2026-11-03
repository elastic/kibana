/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { DayPicker, TZDate, type DateRange } from 'react-day-picker';
import { useEuiTheme } from '@elastic/eui';

import 'react-day-picker/style.css';
import { calendarViewStyles } from './calendar_view.styles';
import type { FirstDayOfWeek } from '../types';

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
   * First day of the week: 0 for Sunday through 6 for Saturday.
   * @default 0
   */
  firstDayOfWeek?: FirstDayOfWeek;
  /** IANA time zone used for calendar dates. */
  timeZone?: string;
}

/**
 * Single-month calendar view backed by react-day-picker.
 */
export const CalendarView = function CalendarView({
  year,
  monthIndex,
  range,
  setRange,
  firstDayOfWeek,
  timeZone,
}: CalendarViewProps) {
  const euiThemeContext = useEuiTheme();
  const styles = calendarViewStyles(euiThemeContext);

  return (
    <DayPicker
      css={styles.dayPicker}
      disableNavigation
      hideNavigation
      mode="range"
      month={timeZone ? new TZDate(year, monthIndex, 1, timeZone) : new Date(year, monthIndex, 1)}
      onSelect={setRange}
      required={false}
      selected={range}
      weekStartsOn={firstDayOfWeek}
      timeZone={timeZone}
    />
  );
};
