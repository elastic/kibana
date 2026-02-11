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
  useEffect,
  useMemo,
  useCallback,
  type PropsWithChildren,
  type RefObject,
} from 'react';

import { useEuiTheme, useGeneratedHtmlId } from '@elastic/eui';

import type { TimeRangeBounds, TimeRange } from './types';
import { DATE_RANGE_INPUT_DELIMITER } from './constants';
import { textToTimeRange } from './parse';
import { durationToDisplayShortText, timeRangeToDisplayText } from './format';
import type { DateRangePickerProps, DateRangePickerOnChangeProps } from './date_range_picker';

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

/**
 * Determines which element receives focus when ArrowDown is pressed from the input.
 * A string is treated as a CSS selector resolved against the panel; a ref points
 * to the element directly. When unset, defaults to the panel div itself.
 */
export type InitialFocus = RefObject<HTMLElement | null> | string;

/** Internal context value used by sub-components. */
interface DateRangePickerInternalContextValue extends DateRangePickerContextValue {
  isEditing: boolean;
  setIsEditing: (value: boolean) => void;
  compressed: boolean;
  maxWidth: string;
  displayText: string;
  displayDuration: string | null;
  inputRef: RefObject<HTMLInputElement>;
  buttonRef: RefObject<HTMLButtonElement>;
  panelRef: RefObject<HTMLDivElement>;
  /** Generated HTML id for the dialog panel, used for ARIA `aria-controls`. */
  panelId: string;
  /** Optional initial focus target for the dialog panel. */
  initialFocus?: InitialFocus;
  timeRange: TimeRange;
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
  value,
  onChange,
  dateFormat,
  isInvalid: isInvalidProp,
  compressed = true,
}: PropsWithChildren<DateRangePickerProps>) {
  const { euiTheme } = useEuiTheme();
  const maxWidth = euiTheme.components.forms.maxWidth;

  const inputRef = useRef<HTMLInputElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const panelId = useGeneratedHtmlId({ prefix: 'dateRangePickerPanel' });
  const lastValidText = useRef('');
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [text, setText] = useState<string>(() => value ?? '');
  const timeRange: TimeRange = useMemo(() => textToTimeRange(text), [text]);
  const displayText = useMemo(
    () => timeRangeToDisplayText(timeRange, { dateFormat }),
    [dateFormat, timeRange]
  );
  const duration =
    timeRange.startDate && timeRange.endDate
      ? { startDate: timeRange.startDate, endDate: timeRange.endDate }
      : null;
  const displayDuration = duration
    ? durationToDisplayShortText(duration.startDate, duration.endDate)
    : null;

  // TODO separate a "live" validity prop that should be available in context
  // from the `isInvalid` top-level prop that will be passed down to control
  const isInvalid = isInvalidProp || timeRange.isInvalid;

  useEffect(() => {
    if (!isEditing && text.trim() === '' && lastValidText.current) {
      setText(lastValidText.current);
      lastValidText.current = '';
    }
  }, [text, isEditing]);

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

      const changeProps: DateRangePickerOnChangeProps = {
        start: rangeToApply.start,
        end: rangeToApply.end,
        startDate: rangeToApply.startDate,
        endDate: rangeToApply.endDate,
        value: rangeToApply.value,
        isInvalid: rangeToApply.isInvalid,
      };

      onChange(changeProps);
      setIsEditing(false);
    },
    [onChange, timeRange]
  );

  const setIsEditingWithSave = useCallback(
    (editing: boolean) => {
      if (editing && text) {
        lastValidText.current = text;
      }
      setIsEditing(editing);
    },
    [text]
  );

  const contextValue = useMemo<DateRangePickerInternalContextValue>(
    () => ({
      text,
      isInvalid,
      setText,
      applyRange,
      isEditing,
      setIsEditing: setIsEditingWithSave,
      compressed,
      maxWidth,
      displayText,
      displayDuration,
      inputRef,
      buttonRef,
      panelRef,
      panelId,
      timeRange,
    }),
    [
      text,
      isInvalid,
      applyRange,
      isEditing,
      setIsEditingWithSave,
      compressed,
      maxWidth,
      displayText,
      displayDuration,
      panelId,
      timeRange,
    ]
  );

  return (
    <DateRangePickerContext.Provider value={contextValue}>
      {children}
    </DateRangePickerContext.Provider>
  );
}
