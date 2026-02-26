/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, {
  createContext,
  useContext,
  useState,
  useRef,
  useMemo,
  useCallback,
  type PropsWithChildren,
  type RefObject,
} from 'react';

import { useEuiTheme, useGeneratedHtmlId } from '@elastic/eui';

import type { TimeRangeBounds, TimeRange, InitialFocus } from './types';
import { DATE_RANGE_INPUT_DELIMITER } from './constants';
import { textToTimeRange } from './parse';
import {
  durationToDisplayShortText,
  timeRangeToDisplayText,
  timeRangeToFullFormattedText,
} from './format';
import type { DateRangePickerProps, DateRangePickerOnChangeProps } from './date_range_picker';
import type { TimeWindowButtonsConfig } from './date_range_picker_time_window_buttons';

/** Public context value exposed to consumers via `useDateRangePickerContext`. */
export interface DateRangePickerContextValue {
  /** Current input text */
  text: string;
  /** Whether the current input is invalid */
  isInvalid: boolean;
  /** Update the input text */
  setText: (value: string) => void;
  /**
   * Apply the current text (or an explicit range) as the selected time range.
   * When called with a `TimeRangeBounds`, sets text to that range; otherwise applies current text.
   * Calls parent `onChange` and exits editing mode.
   */
  applyRange: (range?: TimeRangeBounds) => void;
}

/** Internal context value used by sub-components. */
interface DateRangePickerInternalContextValue extends DateRangePickerContextValue {
  /** Whether the picker is in editing mode (input focused, panel open) or idle. */
  isEditing: boolean;
  /** Toggle editing mode; restores previous text when exiting without applying. */
  setIsEditing: (value: boolean) => void;
  /** Whether to use EUI compressed form styling. */
  compressed: boolean;
  /** Maximum width for the picker control, derived from EUI theme. */
  maxWidth: string;
  /** Human-readable display text for the current time range (shown when idle). */
  displayText: string;
  /** Full formatted text including absolute dates, used for tooltips. */
  displayFullFormattedText: string;
  /** Short duration label (e.g., "15m"), or `null` if duration cannot be computed. */
  displayShortDuration: string | null;
  /** Ref to the text input element for focus management. */
  inputRef: RefObject<HTMLInputElement>;
  /** Ref to the trigger button for focus restoration. */
  buttonRef: RefObject<HTMLButtonElement>;
  /** Ref to the popover panel for click-outside detection. */
  panelRef: RefObject<HTMLDivElement>;
  /** Generated HTML id for the dialog panel, used for ARIA `aria-controls`. */
  panelId: string;
  /** Optional initial focus target for the dialog panel. */
  initialFocus?: InitialFocus;
  /** Parsed time range derived from the current text input. */
  timeRange: TimeRange;
  /** Resolved time window buttons config, or `false` when disabled. */
  timeWindowButtonsConfig: TimeWindowButtonsConfig | false;
}

const DateRangePickerContext = createContext<DateRangePickerInternalContextValue | null>(null);

/**
 * Hook to access the DateRangePicker context.
 * Must be used within a `DateRangePickerProvider`.
 */
export function useDateRangePickerContext(): DateRangePickerInternalContextValue {
  const context = useContext(DateRangePickerContext);
  if (!context) {
    throw new Error('useDateRangePickerContext must be used within a DateRangePickerProvider');
  }
  return context;
}

/**
 * Provider component that owns all DateRangePicker state.
 */
export function DateRangePickerProvider({
  children,
  defaultValue,
  onChange,
  dateFormat,
  isInvalid = false,
  compressed = true,
  showTimeWindowButtons = false,
}: PropsWithChildren<DateRangePickerProps>) {
  const { euiTheme } = useEuiTheme();
  const maxWidth = euiTheme.components.forms.maxWidth;

  const inputRef = useRef<HTMLInputElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const panelId = useGeneratedHtmlId({ prefix: 'dateRangePickerPanel' });
  const lastValidText = useRef('');
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [text, setText] = useState<string>(() => defaultValue ?? '');
  const timeRange: TimeRange = useMemo(() => textToTimeRange(text), [text]);
  const displayText = useMemo(
    () => timeRangeToDisplayText(timeRange, { dateFormat }),
    [dateFormat, timeRange]
  );
  const displayFullFormattedText = useMemo(
    () => timeRangeToFullFormattedText(timeRange, { dateFormat }),
    [timeRange, dateFormat]
  );
  const duration =
    timeRange.startDate && timeRange.endDate
      ? { startDate: timeRange.startDate, endDate: timeRange.endDate }
      : null;
  const displayShortDuration = duration
    ? durationToDisplayShortText(duration.startDate, duration.endDate)
    : null;

  const timeWindowButtonsConfig: TimeWindowButtonsConfig | false = useMemo(
    () =>
      showTimeWindowButtons === false
        ? false
        : showTimeWindowButtons === true
        ? {}
        : showTimeWindowButtons,
    [showTimeWindowButtons]
  );

  const setIsEditingWithRestore = useCallback(
    (editing: boolean) => {
      if (editing && text) {
        lastValidText.current = text;
      }
      if (!editing && lastValidText.current) {
        setText(lastValidText.current);
        lastValidText.current = '';
      }
      setIsEditing(editing);
    },
    [text]
  );

  /** Apply a range: parse it, call `onChange`, and exit editing mode. */
  const applyRange = useCallback(
    (range?: TimeRangeBounds) => {
      let rangeToApply: TimeRange;

      if (range) {
        const rangeText = `${range.start} ${DATE_RANGE_INPUT_DELIMITER} ${range.end}`;
        rangeToApply = textToTimeRange(rangeText);
        setText(rangeText);
      } else {
        rangeToApply = timeRange;
      }

      onChange({
        start: rangeToApply.start,
        end: rangeToApply.end,
        startDate: rangeToApply.startDate,
        endDate: rangeToApply.endDate,
        value: rangeToApply.value,
        isInvalid: rangeToApply.isInvalid,
      } satisfies DateRangePickerOnChangeProps);
      setIsEditing(false);
    },
    [onChange, timeRange]
  );

  const contextValue = useMemo<DateRangePickerInternalContextValue>(
    () => ({
      text,
      isInvalid,
      setText,
      applyRange,
      isEditing,
      setIsEditing: setIsEditingWithRestore,
      compressed,
      maxWidth,
      displayText,
      displayFullFormattedText,
      displayShortDuration,
      inputRef,
      buttonRef,
      panelRef,
      panelId,
      timeRange,
      timeWindowButtonsConfig,
    }),
    [
      text,
      isInvalid,
      applyRange,
      isEditing,
      setIsEditingWithRestore,
      compressed,
      maxWidth,
      displayText,
      displayFullFormattedText,
      displayShortDuration,
      panelId,
      timeRange,
      timeWindowButtonsConfig,
    ]
  );

  return (
    <DateRangePickerContext.Provider value={contextValue}>
      {children}
    </DateRangePickerContext.Provider>
  );
}
