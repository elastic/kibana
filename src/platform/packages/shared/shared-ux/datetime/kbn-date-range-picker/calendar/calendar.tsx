/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { useEuiTheme } from '@elastic/eui';

import { CalendarView } from './calendar_view';
import { calendarStyles } from './calendar.styles';

interface CalendarProps {
  // TODO: update any type
  range: any;
  // TODO: update any type
  onRangeChange: (range: any) => void;
}

// TODO: handle interaction and state
export function Calendar({ range, onRangeChange }: CalendarProps) {
  const euiThemeContext = useEuiTheme();
  const styles = calendarStyles(euiThemeContext);

  return (
    <div css={styles.container}>
      <CalendarView />
    </div>
  );
}
