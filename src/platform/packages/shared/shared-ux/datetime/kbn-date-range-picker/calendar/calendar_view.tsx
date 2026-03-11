/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
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
  firstDayOfWeek?: 0 | 1;
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
}: CalendarViewProps) {
  const euiThemeContext = useEuiTheme();
  const styles = calendarViewStyles(euiThemeContext);

  return (
    <DayPicker
      css={styles.dayPicker}
      disableNavigation
      hideNavigation
      fixedWeeks
      mode="range"
      month={new Date(year, monthIndex, 1)}
      onSelect={setRange}
      required={false}
      selected={range}
      weekStartsOn={firstDayOfWeek}
    />
  );
};
