/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import type { DateRange } from 'react-day-picker';

import {
  EuiButton,
  EuiCheckbox,
  EuiFlexGroup,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';

import {
  PanelBody,
  PanelContainer,
  PanelFooter,
  PanelHeader,
  SubPanelHeading,
} from '../date_range_picker_panel_ui';
import { Calendar, HourPicker } from '../calendar';
import { useDateRangePickerContext } from '../date_range_picker_context';
import type { TimeRangeBounds } from '../types';

import { DATE_RANGE_INPUT_DELIMITER } from '../constants';
import { timeRangeToDisplayText } from '../format';
import { textToTimeRange } from '../parse';
import {
  isValidTimeRange,
  isHalfHourExact,
  roundToHalfHour,
  toLocalPreciseString,
} from '../utils';
import { calendarPanelTexts, mainPanelTexts } from '../translations';
import { calendarPanelStyles } from './calendar_panel.styles';

/** Exact time-of-day components (hour, minute, second, millisecond). */
interface TimeExact {
  h: number;
  m: number;
  s: number;
  ms: number;
}

const toTimeExact = (date: Date): TimeExact => ({
  h: date.getHours(),
  m: date.getMinutes(),
  s: date.getSeconds(),
  ms: date.getMilliseconds(),
});

const DEFAULT_START_EXACT: TimeExact = { h: 0, m: 0, s: 0, ms: 0 };
const DEFAULT_END_EXACT: TimeExact = { h: 23, m: 30, s: 0, ms: 0 };

/**
 * Builds a Date from a calendar date (year/month/day) and exact time components.
 * All arithmetic stays in local time.
 */
const applyTimeExact = (date: Date, t: TimeExact): Date =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate(), t.h, t.m, t.s, t.ms);

/**
 * Builds validated input text (local-precise format) and UTC ISO bounds from a
 * date range and exact time components.  Returns null when the range is invalid.
 */
const buildRangeInputText = (
  range: DateRange,
  startExact: TimeExact,
  endExact: TimeExact
): { start: string; end: string; inputText: string } | null => {
  if (!range.from) return null;

  const startDate = applyTimeExact(range.from, startExact);
  const endDate = applyTimeExact(range.to ?? range.from, endExact);

  const start = startDate.toISOString();
  const end = endDate.toISOString();

  const parsed = textToTimeRange(`${start} ${DATE_RANGE_INPUT_DELIMITER} ${end}`);
  if (parsed.isInvalid || !isValidTimeRange(parsed)) return null;

  const inputText = `${toLocalPreciseString(startDate)} ${DATE_RANGE_INPUT_DELIMITER} ${toLocalPreciseString(endDate)}`;
  return { start, end, inputText };
};

/** Calendar-based date selection panel. */
export function CalendarPanel() {
  const { applyRange, onPresetSave, setText, text, timeRange } = useDateRangePickerContext();
  const euiThemeContext = useEuiTheme();
  const styles = calendarPanelStyles(euiThemeContext);
  const saveAsPresetCheckboxId = useGeneratedHtmlId({ prefix: 'saveAsPreset' });

  const [range, setRange] = useState<DateRange | undefined>(() =>
    timeRange.startDate && timeRange.endDate
      ? { from: timeRange.startDate, to: timeRange.endDate }
      : undefined
  );

  /**
   * Exact time-of-day for each bound.  Initialised from the resolved dates so that
   * sub-minute precision (e.g. "Last 20 minutes" → 14:12:59) is preserved in the
   * input even when the hour picker displays the rounded approximation.
   *
   * Picking a specific slot in the hour picker replaces these with the chosen
   * HH:mm (seconds/ms = 0), making them exact.
   */
  const [startExact, setStartExact] = useState<TimeExact>(() =>
    timeRange.startDate ? toTimeExact(timeRange.startDate) : DEFAULT_START_EXACT
  );
  const [endExact, setEndExact] = useState<TimeExact>(() =>
    timeRange.endDate ? toTimeExact(timeRange.endDate) : DEFAULT_END_EXACT
  );

  // Rounded half-hour string shown in the picker — derived from exact components
  const startHour = useMemo(
    () => roundToHalfHour(new Date(2000, 0, 1, startExact.h, startExact.m)),
    [startExact]
  );
  const endHour = useMemo(
    () => roundToHalfHour(new Date(2000, 0, 1, endExact.h, endExact.m)),
    [endExact]
  );

  /**
   * True when the displayed half-hour slot is a rounded approximation of a more
   * precise time.  Becomes false as soon as the user picks an explicit slot
   * (setting s=0, ms=0 and minutes exactly on :00 or :30).
   */
  const isStartApproximate = useMemo(
    () =>
      !isHalfHourExact(
        new Date(2000, 0, 1, startExact.h, startExact.m, startExact.s, startExact.ms)
      ),
    [startExact]
  );
  const isEndApproximate = useMemo(
    () =>
      !isHalfHourExact(
        new Date(2000, 0, 1, endExact.h, endExact.m, endExact.s, endExact.ms)
      ),
    [endExact]
  );

  const [saveAsPreset, setSaveAsPreset] = useState(false);

  // Captured once so the mount effect can read exact initial dates without being re-triggered
  const initialDatesRef = useRef({ from: range?.from, to: range?.to });

  /**
   * Pre-computed mount text — the value the mount effect will write to the input.
   * Initialising lastSetTextRef to this value prevents the external-change effect from
   * firing spuriously on the first render when the context's `text` is still the raw
   * default (e.g. "last 15 minutes") and hasn't yet been replaced by the mount effect.
   */
  const initialMountText =
    timeRange.startDate && timeRange.endDate
      ? `${toLocalPreciseString(timeRange.startDate)} ${DATE_RANGE_INPUT_DELIMITER} ${toLocalPreciseString(timeRange.endDate)}`
      : '';

  // Tracks the last text value we set programmatically, to distinguish our writes from user input
  const lastSetTextRef = useRef<string>(initialMountText);
  // Set to true when state was just updated from a text-input change; prevents the
  // interaction effect from immediately echoing the text back (which would reformat / move cursor)
  const updatingFromTextRef = useRef(false);
  // Only trigger the interaction effect after the user has interacted with calendar/pickers
  const hasInteracted = useRef(false);

  /** On mount: immediately show the resolved exact absolute range in local time. */
  useEffect(() => {
    const { from, to } = initialDatesRef.current;
    if (!from || !to) return;
    const val = `${toLocalPreciseString(from)} ${DATE_RANGE_INPUT_DELIMITER} ${toLocalPreciseString(to)}`;
    lastSetTextRef.current = val;
    setText(val);
  }, [setText]);

  /**
   * External input change: when the user edits the text input directly,
   * parse the new value and update the calendar and hour pickers accordingly.
   * If the text is invalid, the calendar/pickers stay at the last valid state.
   */
  useEffect(() => {
    // Skip if we were the ones who changed the text
    if (text === lastSetTextRef.current) return;
    // Skip if the new text doesn't parse to a valid range
    if (timeRange.isInvalid || !timeRange.startDate || !timeRange.endDate) return;

    const { startDate, endDate } = timeRange;
    updatingFromTextRef.current = true;
    hasInteracted.current = true;
    setRange({ from: startDate, to: endDate });
    setStartExact(toTimeExact(startDate));
    setEndExact(toTimeExact(endDate));
  }, [text, timeRange]);

  const handleRangeChange = useCallback(
    (newRange: DateRange | undefined) => {
      hasInteracted.current = true;

      if (range?.from && range?.to) {
        const fromChanged = newRange?.from?.getTime() !== range.from.getTime();
        const clickedDate = fromChanged ? newRange?.from : newRange?.to;
        setRange({ from: clickedDate, to: undefined });
        return;
      }

      setRange(newRange);
    },
    [range]
  );

  const handleStartHourChange = useCallback((hour: string) => {
    hasInteracted.current = true;
    const [h, m] = hour.split(':').map(Number);
    setStartExact({ h, m, s: 0, ms: 0 });
  }, []);

  const handleEndHourChange = useCallback((hour: string) => {
    hasInteracted.current = true;
    const [h, m] = hour.split(':').map(Number);
    setEndExact({ h, m, s: 0, ms: 0 });
  }, []);

  const isApplyDisabled = useMemo(
    () => !range?.from || !range?.to || !buildRangeInputText(range, startExact, endExact),
    [range, startExact, endExact]
  );

  /**
   * Sync input after user interaction with the calendar or hour pickers.
   * Skipped when the state was just driven by an external text-input change.
   */
  useEffect(() => {
    if (updatingFromTextRef.current) {
      updatingFromTextRef.current = false;
      return;
    }
    if (!hasInteracted.current || !range?.from) return;
    const result = buildRangeInputText(range, startExact, endExact);
    if (result) {
      lastSetTextRef.current = result.inputText;
      setText(result.inputText);
    }
  }, [range, startExact, endExact, setText]);

  const onApply = useCallback(() => {
    if (!range?.from) return;

    const result = buildRangeInputText(range, startExact, endExact);
    if (!result) return;

    const { start, end, inputText } = result;
    const rangeBounds: TimeRangeBounds = { start, end };

    applyRange(rangeBounds);

    if (onPresetSave && saveAsPreset) {
      const parsed = textToTimeRange(inputText);

      onPresetSave({
        ...rangeBounds,
        label: timeRangeToDisplayText({
          ...parsed,
          startDate: new Date(start),
          endDate: new Date(end),
        }),
      });
    }
  }, [range, startExact, endExact, applyRange, onPresetSave, saveAsPreset]);

  return (
    <PanelContainer>
      <PanelHeader>
        <SubPanelHeading>{mainPanelTexts.calendarPanelTitle}</SubPanelHeading>
      </PanelHeader>
      <PanelBody padding={false}>
        <EuiFlexGroup gutterSize="none">
          <Calendar range={range} onRangeChange={handleRangeChange} />
          <div css={styles.timeColumn}>
            <div css={styles.timeSection}>
              <p css={styles.timeSectionHeader}>{calendarPanelTexts.startTimeLabel}</p>
              <HourPicker
                selectedHour={startHour}
                onHourChange={handleStartHourChange}
                isApproximate={isStartApproximate}
                aria-label={calendarPanelTexts.startTimeLabel}
              />
            </div>
            <div css={styles.timeSection}>
              <p css={styles.timeSectionHeader}>{calendarPanelTexts.endTimeLabel}</p>
              <HourPicker
                selectedHour={endHour}
                onHourChange={handleEndHourChange}
                isApproximate={isEndApproximate}
                aria-label={calendarPanelTexts.endTimeLabel}
              />
            </div>
          </div>
        </EuiFlexGroup>
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
          <EuiButton size="s" fill onClick={onApply} disabled={isApplyDisabled}>
            {calendarPanelTexts.applyButton}
          </EuiButton>
        </EuiFlexGroup>
      </PanelFooter>
    </PanelContainer>
  );
}
CalendarPanel.PANEL_ID = 'calendar-panel';
