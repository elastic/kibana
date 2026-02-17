/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, {
  useState,
  useRef,
  useEffect,
  useMemo,
  type KeyboardEvent,
  type ChangeEvent,
} from 'react';

import {
  EuiBadge,
  EuiFieldText,
  EuiFormControlButton,
  EuiFormControlLayout,
  EuiOutsideClickDetector,
  keys,
  useEuiTheme,
} from '@elastic/eui';

import { css } from '@emotion/react';

import type { TimeRangeBounds, TimeRange } from './types';
import { textToTimeRange } from './parse';
import { durationToDisplayShortText, timeRangeToDisplayText } from './format';

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
  const { defaultValue, onChange, dateFormat, isInvalid, compressed = true } = props;
  const { euiTheme } = useEuiTheme();

  const inputRef = useRef<HTMLInputElement>(null);
  const lastValidText = useRef('');
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [text, setText] = useState<string>(() => defaultValue ?? '');
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

  useEffect(() => {
    if (!isEditing && text.trim() === '' && lastValidText.current) {
      setText(lastValidText.current);
      lastValidText.current = '';
    }
  }, [text, isEditing]);

  const onButtonClick = () => {
    setIsEditing(true);
    if (text) {
      lastValidText.current = text;
    }
  };
  const onInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    setText(event.target.value);
  };
  const onInputKeyDown = (event: KeyboardEvent) => {
    if (event.key === keys.ENTER && isEditing && text) {
      onChange({
        start: timeRange.start,
        end: timeRange.end,
        startDate: timeRange.startDate,
        endDate: timeRange.endDate,
        value: timeRange.value,
        isInvalid: timeRange.isInvalid,
      });
      setIsEditing(false);
    }
    if (event.key === keys.ESCAPE && isEditing) {
      if (lastValidText.current) {
        setText(lastValidText.current);
        lastValidText.current = '';
      }
      setIsEditing(false);
    }
  };
  const onInputClear = () => {
    setText('');
    inputRef.current?.focus();
  };
  const onOutsideClick = () => {
    if (isEditing) setIsEditing(false);
  };

  const wrapperStyles = css`
    display: flex;
    align-items: center;
    gap: ${euiTheme.size.s};
  `;

  return (
    <EuiOutsideClickDetector onOutsideClick={onOutsideClick}>
      <div css={wrapperStyles}>
        <EuiFormControlLayout
          compressed={compressed}
          isInvalid={isInvalid}
          clear={isEditing && text !== '' ? { onClick: onInputClear } : undefined}
        >
          {isEditing ? (
            <EuiFieldText
              data-test-subj="dateRangePickerInput"
              autoFocus
              inputRef={inputRef}
              controlOnly
              value={text}
              isInvalid={isInvalid}
              onChange={onInputChange}
              onKeyDown={onInputKeyDown}
              compressed={compressed}
            />
          ) : (
            <EuiFormControlButton
              data-test-subj="dateRangePickerControlButton"
              value={displayText}
              onClick={onButtonClick}
              isInvalid={isInvalid}
              compressed={compressed}
            >
              {displayDuration && <EuiBadge>{displayDuration}</EuiBadge>}
            </EuiFormControlButton>
          )}
        </EuiFormControlLayout>
      </div>
    </EuiOutsideClickDetector>
  );
}
