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
import { DATE_TYPE_ABSOLUTE } from '../constants';
import {
  PanelBody,
  PanelContainer,
  PanelFooter,
  PanelHeader,
  SubPanelHeading,
} from '../date_range_picker_panel_ui';
import { calendarPanelTexts, mainPanelTexts } from '../translations';
import { timeRangeToDisplayText } from '../format';
import { combineDateAndTime, formatDateRange, toLocalPreciseString } from '../utils';
import { useDateRangePickerContext } from '../date_range_picker_context';
import {
  DEFAULT_END_HOUR,
  DEFAULT_END_MINUTE,
  DEFAULT_START_HOUR,
  DEFAULT_START_MINUTE,
} from './calendar_panel.constants';

/** Calendar-based date selection panel. */
export function CalendarPanel() {
  const { applyRange, onPresetSave, setText, text, timeRange, calendarOptions } =
    useDateRangePickerContext();
  const saveAsPresetCheckboxId = useGeneratedHtmlId({ prefix: 'saveAsPreset' });

  const [pendingFrom, setPendingFrom] = useState<Date | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [saveAsPreset, setSaveAsPreset] = useState(false);

  const originalTextRef = useRef(text);
  const timeSourceRef = useRef({
    startDate: timeRange.startDate,
    endDate: timeRange.endDate,
  });

  // Derived range: pending single-click selection takes priority, otherwise derive from text
  const range: DateRange | undefined = useMemo(() => {
    if (pendingFrom) return { from: pendingFrom, to: undefined };
    if (timeRange.startDate && timeRange.endDate)
      return { from: timeRange.startDate, to: timeRange.endDate };

    return undefined;
  }, [pendingFrom, timeRange.startDate, timeRange.endDate]);

  // On mount: convert to absolute format so user sees resolved dates
  useEffect(() => {
    if (timeSourceRef.current.startDate && timeSourceRef.current.endDate) {
      setText(formatDateRange(timeSourceRef.current.startDate, timeSourceRef.current.endDate));
    }
  }, [setText]);

  const hasTimeRangeChanged = useMemo(() => {
    if (!timeRange.startDate || !timeRange.endDate) return false;
    return (
      timeRange.startDate.getTime() !== timeSourceRef.current.startDate?.getTime() ||
      timeRange.endDate.getTime() !== timeSourceRef.current.endDate?.getTime()
    );
  }, [timeRange.startDate, timeRange.endDate]);

  const restoreOriginalText = useCallback(() => {
    setText(originalTextRef.current);
  }, [setText]);

  const getStartDate = useCallback(
    (date: Date) =>
      combineDateAndTime(
        date,
        timeSourceRef.current.startDate,
        DEFAULT_START_HOUR,
        DEFAULT_START_MINUTE
      ),
    []
  );

  const getEndDate = useCallback(
    (date: Date) =>
      combineDateAndTime(date, timeSourceRef.current.endDate, DEFAULT_END_HOUR, DEFAULT_END_MINUTE),
    []
  );

  const getOrderedDates = useCallback(
    (from: Date, to: Date): { start: Date; end: Date } => {
      const startDate = getStartDate(from);
      const endDate = getEndDate(to);

      return startDate <= endDate
        ? { start: startDate, end: endDate }
        : { start: endDate, end: startDate };
    },
    [getStartDate, getEndDate]
  );

  const formatRangeText = useCallback(
    (from: Date, to?: Date): string => {
      if (!to) return toLocalPreciseString(getStartDate(from));

      const { start, end } = getOrderedDates(from, to);
      return formatDateRange(start, end);
    },
    [getStartDate, getOrderedDates]
  );

  const absoluteRange = useMemo(() => {
    if (!range?.from || !range?.to) return null;

    const { start, end } = getOrderedDates(range.from, range.to);

    return {
      start: toLocalPreciseString(start),
      end: toLocalPreciseString(end),
      startDate: start,
      endDate: end,
      inputText: formatDateRange(start, end),
    };
  }, [range, getOrderedDates]);

  const handleRangeChange = useCallback(
    (newRange: DateRange | undefined) => {
      setHasChanges(true);

      // Complete range visible — user is starting a new selection
      if (!pendingFrom && range?.from && range?.to) {
        const fromChanged = newRange?.from?.getTime() !== range.from.getTime();
        const clickedDate = fromChanged ? newRange?.from : newRange?.to;

        setPendingFrom(clickedDate ?? null);
        if (clickedDate) setText(formatRangeText(clickedDate));
        return;
      }

      // Second click — completing the range
      if (pendingFrom && newRange?.from && newRange?.to) {
        setPendingFrom(null);
        setText(formatRangeText(newRange.from, newRange.to));
        return;
      }

      // First click with no existing selection
      if (newRange?.from) {
        setPendingFrom(newRange.from);
        setText(formatRangeText(newRange.from));
      }
    },
    [pendingFrom, range, setText, formatRangeText]
  );

  const isRangeComplete = Boolean(range?.from && range?.to);
  const isApplyDisabled =
    !(hasChanges || hasTimeRangeChanged) || !isRangeComplete || !absoluteRange;

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
          startDate: absoluteRange.startDate,
          endDate: absoluteRange.endDate,
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
      <PanelBody spacingSide="none">
        <Calendar
          range={range}
          onRangeChange={handleRangeChange}
          firstDayOfWeek={calendarOptions?.firstDayOfWeek}
        />
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
