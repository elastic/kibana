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
  const { applyRange, onPresetSave, setText, text, timeRange } = useDateRangePickerContext();
  const saveAsPresetCheckboxId = useGeneratedHtmlId({ prefix: 'saveAsPreset' });

  const [range, setRange] = useState<DateRange | undefined>(() =>
    timeRange.startDate && timeRange.endDate
      ? { from: timeRange.startDate, to: timeRange.endDate }
      : undefined
  );

  const [hasChanges, setHasChanges] = useState(false);
  const [saveAsPreset, setSaveAsPreset] = useState(false);

  const initialStateRef = useRef({
    startDate: timeRange.startDate,
    endDate: timeRange.endDate,
    text,
    mountText:
      timeRange.startDate && timeRange.endDate
        ? formatDateRange(timeRange.startDate, timeRange.endDate)
        : null,
  });

  // On mount: convert to absolute format so user sees resolved dates
  useEffect(() => {
    if (initialStateRef.current.mountText) {
      setText(initialStateRef.current.mountText);
    }
  }, [setText]);

  const restoreOriginalText = useCallback(() => {
    setText(initialStateRef.current.text);
  }, [setText]);

  const getStartDate = useCallback(
    (date: Date) =>
      combineDateAndTime(
        date,
        initialStateRef.current.startDate,
        DEFAULT_START_HOUR,
        DEFAULT_START_MINUTE
      ),
    []
  );

  const getEndDate = useCallback(
    (date: Date) =>
      combineDateAndTime(
        date,
        initialStateRef.current.endDate,
        DEFAULT_END_HOUR,
        DEFAULT_END_MINUTE
      ),
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
      start: start.toISOString(),
      end: end.toISOString(),
      inputText: formatDateRange(start, end),
    };
  }, [range, getOrderedDates]);

  const handleRangeChange = useCallback(
    (newRange: DateRange | undefined) => {
      setHasChanges(true);

      // Reset to single date when clicking after complete selection
      if (range?.from && range?.to) {
        const fromChanged = newRange?.from?.getTime() !== range.from.getTime();
        const clickedDate = fromChanged ? newRange?.from : newRange?.to;

        setRange({ from: clickedDate, to: undefined });
        if (clickedDate) setText(formatRangeText(clickedDate));
        return;
      }

      setRange(newRange);

      if (newRange?.from) {
        setText(formatRangeText(newRange.from, newRange.to));
      }
    },
    [range, setText, formatRangeText]
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
