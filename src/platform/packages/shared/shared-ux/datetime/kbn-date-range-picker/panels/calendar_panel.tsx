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
import { EuiButton, EuiCheckbox, EuiToolTip, useGeneratedHtmlId } from '@elastic/eui';

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
import { getEndDate, getStartDate, formatDateRange, formatAbsoluteDate } from '../utils';
import { useDateRangePickerContext } from '../date_range_picker_context';

/** Calendar-based date selection panel. */
export function CalendarPanel() {
  const { applyRange, onPresetSave, setText, text, timeRange, calendarOptions, settings } =
    useDateRangePickerContext();
  const timePrecision = settings.timePrecision ?? 's';
  const saveAsPresetCheckboxId = useGeneratedHtmlId({ prefix: 'saveAsPreset' });

  const [pendingFrom, setPendingFrom] = useState<Date | null>(null);

  const [saveAsPreset, setSaveAsPreset] = useState(false);

  const originalTextRef = useRef(text);
  const timeSourceRef = useRef({
    startDate: timeRange.startDate,
    endDate: timeRange.endDate,
  });

  // Derived range: pending single-click selection takes priority, otherwise derive from text
  const calendarRange: DateRange | undefined = useMemo(() => {
    if (pendingFrom) return { from: pendingFrom, to: undefined };
    if (timeRange.startDate && timeRange.endDate)
      return { from: timeRange.startDate, to: timeRange.endDate };

    return undefined;
  }, [pendingFrom, timeRange.startDate, timeRange.endDate]);

  // On mount: convert to absolute format so user sees resolved dates
  useEffect(() => {
    if (timeSourceRef.current.startDate && timeSourceRef.current.endDate) {
      setText(
        formatDateRange(
          timeSourceRef.current.startDate,
          timeSourceRef.current.endDate,
          timePrecision
        )
      );
    }
  }, [setText, timePrecision]);

  const restoreOriginalText = useCallback(() => {
    setText(originalTextRef.current);
  }, [setText]);

  const getOrderedDates = useCallback((from: Date, to: Date): { start: Date; end: Date } => {
    const startDate = getStartDate(from);
    const endDate = getEndDate(to);

    return startDate <= endDate
      ? { start: startDate, end: endDate }
      : { start: endDate, end: startDate };
  }, []);

  const formatRangeText = useCallback(
    (from: Date, to?: Date): string => {
      if (!to) return formatAbsoluteDate(getStartDate(from), timePrecision);

      const { start, end } = getOrderedDates(from, to);
      return formatDateRange(start, end, timePrecision);
    },
    [getOrderedDates, timePrecision]
  );

  const absoluteRange = useMemo(() => {
    if (!calendarRange?.from || !calendarRange?.to) return null;

    const { start, end } = getOrderedDates(calendarRange.from, calendarRange.to);

    return {
      start: start.toISOString(),
      end: end.toISOString(),
      startDate: start,
      endDate: end,
      inputText: formatDateRange(start, end, timePrecision),
    };
  }, [calendarRange, getOrderedDates, timePrecision]);

  const handleRangeChange = useCallback(
    (newRange: DateRange | undefined) => {
      // Complete range visible — user is starting a new selection
      if (!pendingFrom && calendarRange?.from && calendarRange?.to) {
        const fromChanged = newRange?.from?.getTime() !== calendarRange.from.getTime();
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
    [pendingFrom, calendarRange, setText, formatRangeText]
  );

  const isRangeComplete = Boolean(calendarRange?.from && calendarRange?.to);
  const isApplyDisabled = !isRangeComplete || !absoluteRange;

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
          startOffset: null,
          endOffset: null,
        }),
      });
    }
  }, [absoluteRange, applyRange, onPresetSave, saveAsPreset]);

  const applyButton = (
    <EuiButton
      size="s"
      fill
      onClick={onApply}
      disabled={isApplyDisabled}
      data-test-subj="dateRangePickerCalendarApplyButton"
    >
      {calendarPanelTexts.applyButton}
    </EuiButton>
  );

  return (
    <PanelContainer data-test-subj="dateRangePickerCalendarPanel">
      <PanelHeader>
        <SubPanelHeading onGoBack={restoreOriginalText}>
          {mainPanelTexts.calendarPanelTitle}
        </SubPanelHeading>
      </PanelHeader>
      <PanelBody spacingSide="none">
        <Calendar
          range={calendarRange}
          onRangeChange={handleRangeChange}
          firstDayOfWeek={calendarOptions?.firstDayOfWeek}
        />
      </PanelBody>
      <PanelFooter
        primaryAction={
          isApplyDisabled && !isRangeComplete ? (
            <EuiToolTip content={calendarPanelTexts.selectEndDateTooltip}>{applyButton}</EuiToolTip>
          ) : (
            applyButton
          )
        }
      >
        {onPresetSave && (
          <EuiCheckbox
            id={saveAsPresetCheckboxId}
            label={calendarPanelTexts.saveAsPreset}
            checked={saveAsPreset}
            onChange={() => setSaveAsPreset((prev) => !prev)}
            data-test-subj="dateRangePickerCalendarSaveCheckbox"
          />
        )}
      </PanelFooter>
    </PanelContainer>
  );
}
CalendarPanel.PANEL_ID = 'calendar-panel';
