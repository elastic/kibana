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
import 'react-day-picker/style.css';

import { useCalendarViewStyles } from './calendar_view.styles';

interface CalendarViewProps {
  /** The month to display in the calendar. */
  month: Date;
  /** The range to display in the calendar. */
  range: DateRange | undefined;
  /** The function to set the range in the calendar. */
  setRange: (range?: DateRange) => void;
}

/**
 * The calendar view component. Displays a calendar with the given month and range.
 * Based on `react-day-picker`.
 */
export function CalendarView({ month, range, setRange }: CalendarViewProps) {
  const styles = useCalendarViewStyles();

  return (
    <DayPicker
      mode="range"
      month={month}
      selected={range}
      onSelect={setRange}
      required={false}
      disableNavigation
      hideNavigation
      styles={styles.dayPicker}
    />
  );
}
