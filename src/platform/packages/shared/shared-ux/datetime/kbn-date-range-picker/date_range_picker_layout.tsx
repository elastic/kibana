/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { type PropsWithChildren } from 'react';
import { css } from '@emotion/react';

import { useEuiTheme } from '@elastic/eui';

import { useDateRangePickerContext } from './date_range_picker_context';
import { TimeWindowButtons } from './date_range_picker_time_window_buttons';

/**
 * Outer layout wrapper for the DateRangePicker.
 * Arranges the dialog and optional time-window buttons in a horizontal row.
 */
export function DateRangePickerLayout({ children }: PropsWithChildren) {
  const { timeWindowButtonsConfig } = useDateRangePickerContext();
  const { euiTheme } = useEuiTheme();

  // TODO set max-inline-size based on `width` prop?
  const containerStyles = css`
    display: flex;
    align-items: center;
    gap: ${euiTheme.size.s};
  `;

  return (
    <div css={containerStyles}>
      {children}
      {timeWindowButtonsConfig && <TimeWindowButtons config={timeWindowButtonsConfig} />}
    </div>
  );
}
