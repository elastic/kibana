/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import type { DateRange } from 'react-day-picker';
import { EuiButton, EuiCheckbox, EuiFlexGroup, EuiToolTip, useGeneratedHtmlId } from '@elastic/eui';

import type { TimeRangeBounds } from '../types';
import { Calendar } from '../calendar';
import { DATE_RANGE_INPUT_DELIMITER, DATE_TYPE_ABSOLUTE } from '../constants';
import {
  PanelBody,
  PanelContainer,
  PanelFooter,
  PanelHeader,
  SubPanelHeading,
} from '../date_range_picker_panel_ui';
import { calendarPanelTexts, mainPanelTexts } from '../translations';
import { timeRangeToDisplayText } from '../format';
import { toLocalPreciseString } from '../utils';
import { useDateRangePickerContext } from '../date_range_picker_context';

const DEFAULT_END_HOUR = 23;
const DEFAULT_END_MINUTE = 30;

/**
 * Combines date (year/month/day) from `date` with time from `timeSource`.
 * Falls back to defaults when timeSource is null.
 */
const combineDateAndTime = (
  date: Date,
  timeSource: Date | null,
  defaultHour = 0,
  defaultMinute = 0
): Date =>
  new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    timeSource?.getHours() ?? defaultHour,
    timeSource?.getMinutes() ?? defaultMinute,
    timeSource?.getSeconds() ?? 0,
    timeSource?.getMilliseconds() ?? 0
  );

/** Calendar-based date selection panel. */
export function CalendarPanel() {
  const { applyRange, onPresetSave, setText, text, timeRange } = useDateRangePickerContext();
  const saveAsPresetCheckboxId = useGeneratedHtmlId({ prefix: 'saveAsPreset' });

  const [range, setRange] = useState<DateRange | undefined>(() =>
    timeRange.startDate && timeRange.endDate
      ? { from: timeRange.startDate, to: timeRange.endDate }
      : undefined
  );

  const [hasChanges, setHasChanges] = useState(false);
  const [saveAsPreset, setSaveAsPreset] = useState(false);

  const initialStartRef = useRef(timeRange.startDate);
  const initialEndRef = useRef(timeRange.endDate);
  const originalTextRef = useRef(text);
  const mountTextRef = useRef<string | null>(null);

  if (mountTextRef.current === null && timeRange.startDate && timeRange.endDate) {
    mountTextRef.current = `${toLocalPreciseString(
      timeRange.startDate
    )} ${DATE_RANGE_INPUT_DELIMITER} ${toLocalPreciseString(timeRange.endDate)}`;
  }

  // On mount: convert to absolute format so user sees resolved dates
  useEffect(() => {
    if (mountTextRef.current) {
      setText(mountTextRef.current);
    }
  }, [setText]);

  const restoreOriginalText = useCallback(() => {
    setText(originalTextRef.current);
  }, [setText]);

  const absoluteRange = useMemo(() => {
    if (!range?.from || !range?.to) return null;

    const startDate = combineDateAndTime(range.from, initialStartRef.current);
    const endDate = combineDateAndTime(
      range.to,
      initialEndRef.current,
      DEFAULT_END_HOUR,
      DEFAULT_END_MINUTE
    );

    if (startDate > endDate) return null;

    const inputText = `${toLocalPreciseString(
      startDate
    )} ${DATE_RANGE_INPUT_DELIMITER} ${toLocalPreciseString(endDate)}`;

    return {
      start: startDate.toISOString(),
      end: endDate.toISOString(),
      inputText,
    };
  }, [range]);

  const handleRangeChange = useCallback(
    (newRange: DateRange | undefined) => {
      setHasChanges(true);

      // When both dates selected, reset to single date on next click
      if (range?.from && range?.to) {
        const fromChanged = newRange?.from?.getTime() !== range.from.getTime();
        const clickedDate = fromChanged ? newRange?.from : newRange?.to;

        setRange({ from: clickedDate, to: undefined });

        if (clickedDate) {
          const startDate = combineDateAndTime(clickedDate, initialStartRef.current);
          setText(toLocalPreciseString(startDate));
        }

        return;
      }

      setRange(newRange);

      if (newRange?.from && newRange?.to) {
        // Complete range: show both dates
        const startDate = combineDateAndTime(newRange.from, initialStartRef.current);
        const endDate = combineDateAndTime(
          newRange.to,
          initialEndRef.current,
          DEFAULT_END_HOUR,
          DEFAULT_END_MINUTE
        );

        if (startDate <= endDate) {
          setText(
            `${toLocalPreciseString(
              startDate
            )} ${DATE_RANGE_INPUT_DELIMITER} ${toLocalPreciseString(endDate)}`
          );
        }
      } else if (newRange?.from) {
        // Start date only: show just that date
        const startDate = combineDateAndTime(newRange.from, initialStartRef.current);
        setText(toLocalPreciseString(startDate));
      }
    },
    [range, setText]
  );

  const isRangeComplete = Boolean(range?.from && range?.to);
  const isApplyDisabled = !hasChanges || !isRangeComplete || !absoluteRange;

  const onApply = useCallback(() => {
    if (!absoluteRange) return;

    const rangeBounds: TimeRangeBounds = {
      start: absoluteRange.start,
      end: absoluteRange.end,
    };

    applyRange(rangeBounds, absoluteRange.inputText);

    if (onPresetSave && saveAsPreset) {
      onPresetSave({
        ...rangeBounds,
        label: timeRangeToDisplayText({
          value: absoluteRange.inputText,
          start: absoluteRange.start,
          end: absoluteRange.end,
          startDate: new Date(absoluteRange.start),
          endDate: new Date(absoluteRange.end),
          type: [DATE_TYPE_ABSOLUTE, DATE_TYPE_ABSOLUTE],
          isNaturalLanguage: false,
          isInvalid: false,
        }),
      });
    }
  }, [absoluteRange, applyRange, onPresetSave, saveAsPreset]);

  const applyButton = (
    <EuiButton size="s" fill onClick={onApply} disabled={isApplyDisabled}>
      {calendarPanelTexts.applyButton}
    </EuiButton>
  );

  return (
    <PanelContainer>
      <PanelHeader>
        <SubPanelHeading onGoBack={restoreOriginalText}>
          {mainPanelTexts.calendarPanelTitle}
        </SubPanelHeading>
      </PanelHeader>
      <PanelBody padding={false}>
        <Calendar range={range} onRangeChange={handleRangeChange} />
      </PanelBody>
      <PanelFooter>
        <EuiFlexGroup
          alignItems="center"
          justifyContent={onPresetSave ? 'spaceBetween' : 'flexEnd'}
        >
          {onPresetSave && (
            <EuiCheckbox
              id={saveAsPresetCheckboxId}
              label={calendarPanelTexts.saveAsPreset}
              checked={saveAsPreset}
              onChange={() => setSaveAsPreset((prev) => !prev)}
            />
          )}
          {isApplyDisabled && !isRangeComplete ? (
            <EuiToolTip content={calendarPanelTexts.selectEndDateTooltip}>{applyButton}</EuiToolTip>
          ) : (
            applyButton
          )}
        </EuiFlexGroup>
      </PanelFooter>
    </PanelContainer>
  );
}
CalendarPanel.PANEL_ID = 'calendar-panel';
