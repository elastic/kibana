/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState, useEffect, useCallback } from 'react';
import type { DateRange } from 'react-day-picker';

import { EuiButton, EuiCheckbox, EuiFlexGroup, useGeneratedHtmlId } from '@elastic/eui';

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
import { isValidTimeRange } from '../utils';

interface ParsedHour {
  hour: number;
  minute: number;
}

interface CalendarSelectionResult {
  rangeBounds: TimeRangeBounds;
  inputText: string;
  startDate: Date;
  endDate: Date;
}

const parseHourString = (hourStr: string | undefined): ParsedHour => {
  if (!hourStr) return { hour: 0, minute: 0 };
  const [hourPart, minutePart] = hourStr.split(':');
  return {
    hour: parseInt(hourPart, 10) || 0,
    minute: parseInt(minutePart, 10) || 0,
  };
};

const buildAbsoluteRangeFromCalendarSelection = (
  range: DateRange | undefined,
  startHour: string | undefined,
  endHour: string | undefined
): CalendarSelectionResult | null => {
  if (!range?.from || !startHour || !endHour) {
    return null;
  }

  const { hour: startHourValue, minute: startMinuteValue } = parseHourString(startHour);
  const { hour: endHourValue, minute: endMinuteValue } = parseHourString(endHour);

  const startDate = new Date(range.from);
  startDate.setHours(startHourValue, startMinuteValue, 0, 0);

  const endDate = range.to ? new Date(range.to) : new Date(range.from);
  endDate.setHours(endHourValue, endMinuteValue, 0, 0);

  const start = startDate.toISOString();
  const end = endDate.toISOString();
  const inputText = `${start} ${DATE_RANGE_INPUT_DELIMITER} ${end}`;

  const parsedTimeRange = textToTimeRange(inputText);
  if (parsedTimeRange.isInvalid || !isValidTimeRange(parsedTimeRange)) {
    return null;
  }

  return {
    rangeBounds: { start, end },
    inputText,
    startDate,
    endDate,
  };
};

/** Calendar-based date selection panel. */
export function CalendarPanel() {
  const { applyRange, onPresetSave, setText, timeRange } = useDateRangePickerContext();

  const saveAsPresetCheckboxId = useGeneratedHtmlId({ prefix: 'saveAsPreset' });

  const [range, setRange] = useState<DateRange | undefined>(undefined);
  const [startHour, setStartHour] = useState<string | undefined>(undefined);
  const [endHour, setEndHour] = useState<string | undefined>(undefined);
  const [saveAsPreset, setSaveAsPreset] = useState<boolean>(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isSelectingStartHour, setIsSelectingStartHour] = useState(true);

  /** Format hour from Date to "H:mm" string */
  const formatHour = (date: Date): string => {
    const minutes = date.getMinutes();
    return `${date.getHours()}:${minutes === 0 ? '00' : minutes}`;
  };

  /** Initialize from current timeRange when panel first opens */
  useEffect(() => {
    if (!isInitialized && timeRange.startDate && timeRange.endDate) {
      const startDate = new Date(timeRange.startDate);
      const endDate = new Date(timeRange.endDate);
      setRange({ from: startDate, to: endDate });
      setStartHour(formatHour(startDate));
      setEndHour(formatHour(endDate));
      setIsInitialized(true);
    }
  }, [isInitialized, timeRange]);

  /** Initialize hours when date range is manually selected */
  useEffect(() => {
    if (range?.from && !startHour) {
      setStartHour('0:00');
    }
    if (range?.to && !endHour) {
      setEndHour('23:30');
    }
  }, [range, startHour, endHour]);

  /** Handle date range changes - reset hours for manual selection */
  const handleRangeChange = useCallback(
    (newRange: DateRange | undefined) => {
      setRange(newRange);
      if (newRange?.from && !isInitialized) {
        setStartHour('0:00');
      }
      if (newRange?.to && !isInitialized) {
        setEndHour('23:30');
      }
    },
    [isInitialized]
  );

  /** Handle hour selection - toggle between start and end */
  const handleHourChange = useCallback(
    (hour: string) => {
      if (isSelectingStartHour) {
        setStartHour(hour);
        setIsSelectingStartHour(false);
      } else {
        setEndHour(hour);
        setIsSelectingStartHour(true);
      }
    },
    [isSelectingStartHour]
  );

  const toggleSaveAsPreset = () => {
    setSaveAsPreset((prev) => !prev);
  };

  /** Update input preview without exiting edit mode */
  const updateInputPreview = useCallback(() => {
    const selection = buildAbsoluteRangeFromCalendarSelection(range, startHour, endHour);
    if (!selection) return;
    setText(selection.inputText);
  }, [range, startHour, endHour, setText]);

  /** Update input when range or hours change */
  useEffect(() => {
    if (range?.from && startHour && endHour) {
      updateInputPreview();
    }
  }, [range, startHour, endHour, updateInputPreview]);

  const onApply = () => {
    const selection = buildAbsoluteRangeFromCalendarSelection(range, startHour, endHour);
    if (!selection) return;
    const { rangeBounds, inputText, startDate, endDate } = selection;

    applyRange(rangeBounds);

    if (onPresetSave && saveAsPreset) {
      const parsedTimeRange = textToTimeRange(inputText);
      const label = timeRangeToDisplayText({
        ...parsedTimeRange,
        startDate,
        endDate,
      });

      onPresetSave({
        ...rangeBounds,
        label,
      });
    }
  };

  const isApplyDisabled = !buildAbsoluteRangeFromCalendarSelection(range, startHour, endHour);

  return (
    <PanelContainer>
      <PanelHeader>
        <SubPanelHeading>Calendar</SubPanelHeading>
      </PanelHeader>
      <PanelBody>
        <EuiFlexGroup gutterSize="none">
          <Calendar range={range} onRangeChange={handleRangeChange} />
          <HourPicker
            selectedHour={isSelectingStartHour ? startHour : endHour}
            onHourChange={handleHourChange}
          />
        </EuiFlexGroup>
      </PanelBody>
      <PanelFooter>
        <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
          <EuiCheckbox
            id={saveAsPresetCheckboxId}
            label="Save as preset"
            checked={saveAsPreset}
            onChange={toggleSaveAsPreset}
          />
          <EuiButton size="s" fill onClick={onApply} disabled={isApplyDisabled}>
            Apply
          </EuiButton>
        </EuiFlexGroup>
      </PanelFooter>
    </PanelContainer>
  );
}
CalendarPanel.PANEL_ID = 'calendar-panel';
