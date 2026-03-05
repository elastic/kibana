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

interface DateRangePickerLayoutProps extends PropsWithChildren {
  /** CSS class name added to the outermost container element. */
  className?: string;
}

/**
 * Outer layout wrapper for the DateRangePicker.
 * Arranges the dialog and optional time-window buttons in a horizontal row.
 */
export function DateRangePickerLayout({ children, className }: DateRangePickerLayoutProps) {
  const { timeWindowButtonsConfig, width } = useDateRangePickerContext();
  const { euiTheme } = useEuiTheme();

  const containerStyles = css`
    display: inline-flex;
    inline-size: auto;
    align-items: center;
    gap: ${euiTheme.size.s};
  `;
  const containerFullWidthStyles = css`
    display: flex;
    inline-size: 100%;
  `;

  return (
    <div
      className={className}
      css={[containerStyles, width === 'full' && containerFullWidthStyles]}
    >
      {children}
      {timeWindowButtonsConfig && <TimeWindowButtons config={timeWindowButtonsConfig} />}
    </div>
  );
}
