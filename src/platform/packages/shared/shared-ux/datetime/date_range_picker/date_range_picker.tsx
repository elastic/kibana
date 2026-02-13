/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';

import type { TimeRangeBounds } from './types';
import type { TimeWindowButtonsConfig } from './date_range_picker_time_window_buttons';
import { DateRangePickerProvider } from './date_range_picker_context';
import { DateRangePickerDialog } from './date_range_picker_dialog';

export type { TimeWindowButtonsConfig } from './date_range_picker_time_window_buttons';

export interface DateRangePickerProps {
  /** Text representation of the time range */
  defaultValue?: string;

  /** Callback for when the time changes */
  onChange: (props: DateRangePickerOnChangeProps) => void;

  /** Custom format for displaying (and parsing?) dates */
  dateFormat?: string;

  /** Show invalid state */
  isInvalid?: boolean;

  /**
   * Reduce input height and padding
   * @default true
   */
  compressed?: boolean;

  /**
   * Show time window buttons (previous, zoom out, zoom in, next) beside the control.
   * Pass `true` for defaults, or a config object for fine-grained control.
   * @default false
   */
  showTimeWindowButtons?: boolean | TimeWindowButtonsConfig;
}

export interface DateRangePickerOnChangeProps extends TimeRangeBounds {
  /** Start as Date object */
  startDate: Date | null;
  /** End as Date object */
  endDate: Date | null;
  /** Text representation of the time range */
  value: string;
  /** Whether the time range is invalid */
  isInvalid: boolean;
}

/**
 * A date range picker component that accepts natural language and date math input.
 */
export function DateRangePicker(props: DateRangePickerProps) {
  return (
    <DateRangePickerProvider {...props}>
      <DateRangePickerDialog />
    </DateRangePickerProvider>
  );
}
