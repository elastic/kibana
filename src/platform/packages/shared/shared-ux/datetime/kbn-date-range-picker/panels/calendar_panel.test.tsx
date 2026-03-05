/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { fireEvent, screen, within } from '@testing-library/react';
import { renderWithEuiTheme } from '@kbn/test-jest-helpers';

import { CalendarPanel } from './calendar_panel';
import {
  DATE_RANGE_INPUT_DELIMITER,
  DATE_TYPE_ABSOLUTE,
  DATE_TYPE_NOW,
  DATE_TYPE_RELATIVE,
} from '../constants';

const mockUseDateRangePickerContext = jest.fn();

jest.mock('../date_range_picker_context', () => ({
  useDateRangePickerContext: () => mockUseDateRangePickerContext(),
}));

jest.mock('../date_range_picker_panel_ui', () => ({
  PanelContainer: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  PanelHeader: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  PanelBody: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  PanelFooter: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SubPanelHeading: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

/**
 * Calendar mock: renders numbered day buttons for February 2026 (days 1-28).
 * Clicking a day simulates DayPicker's range selection state machine using the
 * current `range` prop.
 *
 * HourPicker is loaded directly from source to avoid pulling in the
 * react-virtuoso Calendar wrapper (react-day-picker's date-fns v4 dep is
 * ESM-only and cannot be required in the current Jest environment).
 */
jest.mock('../calendar', () => {
  const mockReact = jest.requireActual('react');

  function MockCalendar({
    range,
    onRangeChange,
  }: {
    range: { from?: Date; to?: Date } | undefined;
    onRangeChange: (r: { from?: Date; to?: Date } | undefined) => void;
  }) {
    const handleClick = (day: number) => {
      const date = new Date(2026, 1, day);

      if (range?.from && !range.to) {
        onRangeChange({ from: range.from, to: date });
      } else {
        onRangeChange({ from: date, to: undefined });
      }
    };

    return mockReact.createElement(
      'div',
      null,
      Array.from({ length: 28 }, (_, i) => i + 1).map((d) =>
        mockReact.createElement('button', { key: d, onClick: () => handleClick(d) }, d)
      )
    );
  }

  const { HourPicker: MockHourPicker } = jest.requireActual('../calendar/hour_picker');
  return { Calendar: MockCalendar, HourPicker: MockHourPicker };
});

/**
 * Formats a local Date as "YYYY-MM-DDTHH:mm:ss.mmm" (no Z) — mirrors toLocalPreciseString.
 * Timezone-agnostic: always reflects the local date components passed in.
 */
const toLocalPrecise = (d: Date) => {
  const p2 = (n: number) => String(n).padStart(2, '0');
  const p3 = (n: number) => String(n).padStart(3, '0');
  return (
    `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}` +
    `T${p2(d.getHours())}:${p2(d.getMinutes())}:${p2(d.getSeconds())}.${p3(d.getMilliseconds())}`
  );
};

/** Builds the local-precise string for a given Feb 2026 date+hour used in setText assertions. */
const feb2026Local = (day: number, h: number, m: number) =>
  toLocalPrecise(new Date(2026, 1, day, h, m));

/** Combines two ISO-like strings with the standard delimiter. */
const isoRange = (start: string, end: string) =>
  `${start} ${DATE_RANGE_INPUT_DELIMITER} ${end}`;

/** Click a day by its number in the February 2026 calendar. */
const clickDay = (day: number) =>
  fireEvent.click(screen.getByRole('button', { name: String(day) }));

const getStartPicker = () => screen.getByRole('group', { name: 'Start time' });
const getEndPicker = () => screen.getByRole('group', { name: 'End time' });

const clickStartHour = (hour: string) =>
  fireEvent.click(within(getStartPicker()).getByRole('button', { name: hour }));

const clickEndHour = (hour: string) =>
  fireEvent.click(within(getEndPicker()).getByRole('button', { name: hour }));

const isStartHourSelected = (hour: string) =>
  within(getStartPicker()).getByRole('button', { name: hour }).getAttribute('aria-current') ===
  'true';

const isEndHourSelected = (hour: string) =>
  within(getEndPicker()).getByRole('button', { name: hour }).getAttribute('aria-current') === 'true';

describe('CalendarPanel', () => {
  const applyRange = jest.fn();
  const onPresetSave = jest.fn();
  const setText = jest.fn();

  /** Context with computed dates on exact half-hour boundaries. */
  const makeContext = (type: [string, string]) => ({
    applyRange,
    onPresetSave,
    setText,
    // text matches what the mount effect will produce (avoids spurious external-change effect)
    text: isoRange(feb2026Local(1, 10, 0), feb2026Local(2, 12, 0)),
    timeRange: {
      startDate: new Date(2026, 1, 1, 10, 0),
      endDate: new Date(2026, 1, 2, 12, 0),
      type,
      isInvalid: false,
    },
  });

  /** Context with computed dates that are NOT on half-hour boundaries (→ approximate). */
  const makeContextApproximate = () => ({
    applyRange,
    onPresetSave,
    setText,
    text: isoRange(
      toLocalPrecise(new Date(2026, 1, 1, 10, 18)),
      toLocalPrecise(new Date(2026, 1, 2, 10, 38))
    ),
    timeRange: {
      startDate: new Date(2026, 1, 1, 10, 18), // rounds to 10:30
      endDate: new Date(2026, 1, 2, 10, 38), // rounds to 10:30
      type: [DATE_TYPE_ABSOLUTE, DATE_TYPE_ABSOLUTE] as [string, string],
      isInvalid: false,
    },
  });

  /** Context without computed dates (e.g., invalid or empty input). */
  const makeContextNoDates = () => ({
    applyRange,
    onPresetSave,
    setText,
    text: '',
    timeRange: {
      startDate: null,
      endDate: null,
      type: [DATE_TYPE_RELATIVE, DATE_TYPE_NOW] as [string, string],
      isInvalid: false,
    },
  });

  beforeEach(() => {
    applyRange.mockClear();
    onPresetSave.mockClear();
    setText.mockClear();
    mockUseDateRangePickerContext.mockReturnValue(
      makeContext([DATE_TYPE_ABSOLUTE, DATE_TYPE_ABSOLUTE])
    );
  });

  describe('initialization', () => {
    it('immediately converts to absolute range in the text input on mount (local precise format)', () => {
      renderWithEuiTheme(<CalendarPanel />);

      // Mount effect uses exact resolved dates, formatted as local time (no Z)
      expect(setText).toHaveBeenCalledWith(
        isoRange(feb2026Local(1, 10, 0), feb2026Local(2, 12, 0))
      );
    });

    it('converts a relative timeRange to absolute on mount', () => {
      mockUseDateRangePickerContext.mockReturnValue(
        makeContext([DATE_TYPE_RELATIVE, DATE_TYPE_NOW])
      );
      renderWithEuiTheme(<CalendarPanel />);

      expect(setText).toHaveBeenCalledWith(
        isoRange(feb2026Local(1, 10, 0), feb2026Local(2, 12, 0))
      );
    });

    it('does not call setText on mount when no dates are available', () => {
      mockUseDateRangePickerContext.mockReturnValue(makeContextNoDates());
      renderWithEuiTheme(<CalendarPanel />);

      expect(setText).not.toHaveBeenCalled();
    });

    it('initializes the start picker to the rounded local start hour from the timeRange', () => {
      renderWithEuiTheme(<CalendarPanel />);

      // startDate = local 10:00 → roundToHalfHour → '10:00'
      expect(isStartHourSelected('10:00')).toBe(true);
    });

    it('initializes the end picker to the rounded local end hour from the timeRange', () => {
      renderWithEuiTheme(<CalendarPanel />);

      // endDate = local 12:00 → roundToHalfHour → '12:00'
      expect(isEndHourSelected('12:00')).toBe(true);
    });

    it('defaults both pickers to 00:00 / 23:30 when no computed dates are available', () => {
      mockUseDateRangePickerContext.mockReturnValue(makeContextNoDates());
      renderWithEuiTheme(<CalendarPanel />);

      expect(isStartHourSelected('00:00')).toBe(true);
      expect(isEndHourSelected('23:30')).toBe(true);
    });
  });

  describe('approximate indication', () => {
    it('marks start hour as approximate when initial time is not on a half-hour boundary', () => {
      mockUseDateRangePickerContext.mockReturnValue(makeContextApproximate());
      renderWithEuiTheme(<CalendarPanel />);

      // 10:18 rounds to 10:30 → approximate
      expect(
        within(getStartPicker()).getByRole('button', { name: '10:30' }).getAttribute('data-approximate')
      ).toBe('true');
    });

    it('marks end hour as approximate when initial time is not on a half-hour boundary', () => {
      mockUseDateRangePickerContext.mockReturnValue(makeContextApproximate());
      renderWithEuiTheme(<CalendarPanel />);

      // 10:38 rounds to 10:30 → approximate
      expect(
        within(getEndPicker()).getByRole('button', { name: '10:30' }).getAttribute('data-approximate')
      ).toBe('true');
    });

    it('does not mark start hour as approximate when initial time is exactly on a half-hour boundary', () => {
      renderWithEuiTheme(<CalendarPanel />);

      // 10:00 is exact
      expect(
        within(getStartPicker()).getByRole('button', { name: '10:00' }).getAttribute('data-approximate')
      ).toBeNull();
    });

    it('clears the approximate indicator when the user explicitly picks a start hour', () => {
      mockUseDateRangePickerContext.mockReturnValue(makeContextApproximate());
      renderWithEuiTheme(<CalendarPanel />);

      // Initially approximate
      expect(
        within(getStartPicker()).getByRole('button', { name: '10:30' }).getAttribute('data-approximate')
      ).toBe('true');

      clickStartHour('10:30');

      // Now user-chosen → exact
      expect(
        within(getStartPicker()).getByRole('button', { name: '10:30' }).getAttribute('data-approximate')
      ).toBeNull();
    });

    it('clears the approximate indicator when the user explicitly picks an end hour', () => {
      mockUseDateRangePickerContext.mockReturnValue(makeContextApproximate());
      renderWithEuiTheme(<CalendarPanel />);

      clickEndHour('10:30');

      expect(
        within(getEndPicker()).getByRole('button', { name: '10:30' }).getAttribute('data-approximate')
      ).toBeNull();
    });

    it('shows the exact ISO range in the input even when pickers display approximations', () => {
      mockUseDateRangePickerContext.mockReturnValue(makeContextApproximate());
      renderWithEuiTheme(<CalendarPanel />);

      // Mount effect uses exact dates formatted in local time (no Z) — not the rounded picker values
      expect(setText).toHaveBeenCalledWith(
        isoRange(
          toLocalPrecise(new Date(2026, 1, 1, 10, 18)),
          toLocalPrecise(new Date(2026, 1, 2, 10, 38))
        )
      );
    });
  });

  describe('date selection', () => {
    it('calls setText when the first date is clicked', () => {
      mockUseDateRangePickerContext.mockReturnValue(makeContextNoDates());
      renderWithEuiTheme(<CalendarPanel />);

      clickDay(10);

      // Default exact = 00:00:00.000 → local precise "2026-02-10T00:00:00.000"
      expect(setText).toHaveBeenCalledWith(expect.stringContaining(feb2026Local(10, 0, 0)));
    });

    it('calls setText with the full local-precise range after both dates are selected', () => {
      mockUseDateRangePickerContext.mockReturnValue(makeContextNoDates());
      renderWithEuiTheme(<CalendarPanel />);

      clickDay(10);
      clickDay(15);

      expect(setText).toHaveBeenLastCalledWith(
        isoRange(feb2026Local(10, 0, 0), feb2026Local(15, 23, 30))
      );
    });

    it('preserves the exact original time when only the date is changed', () => {
      // startDate = 10:00 (exact half-hour), endDate = 12:00 (exact half-hour)
      renderWithEuiTheme(<CalendarPanel />);

      clickDay(5); // change start date; exact times stay at 10:00 / 12:00

      expect(setText).toHaveBeenLastCalledWith(
        expect.stringContaining(feb2026Local(5, 10, 0))
      );
    });
  });

  describe('hour selection', () => {
    it('updates the start hour and reflects it in the setText call', () => {
      mockUseDateRangePickerContext.mockReturnValue(makeContextNoDates());
      renderWithEuiTheme(<CalendarPanel />);

      clickDay(10);
      clickStartHour('06:00');

      // Picked hour sets exact = {h:6, m:0, s:0, ms:0} → "T06:00:00.000"
      expect(setText).toHaveBeenLastCalledWith(expect.stringContaining(feb2026Local(10, 6, 0)));
    });

    it('updates the end hour independently and reflects it in the setText call', () => {
      mockUseDateRangePickerContext.mockReturnValue(makeContextNoDates());
      renderWithEuiTheme(<CalendarPanel />);

      clickDay(10);
      clickDay(15);
      clickEndHour('06:00');

      expect(setText).toHaveBeenLastCalledWith(expect.stringContaining(feb2026Local(15, 6, 0)));
    });

    it('changing start hour does not affect end hour', () => {
      mockUseDateRangePickerContext.mockReturnValue(makeContextNoDates());
      renderWithEuiTheme(<CalendarPanel />);

      clickDay(10);
      clickDay(15);
      clickStartHour('09:00');

      expect(isEndHourSelected('23:30')).toBe(true);
    });

    it('changing end hour does not affect start hour', () => {
      mockUseDateRangePickerContext.mockReturnValue(makeContextNoDates());
      renderWithEuiTheme(<CalendarPanel />);

      clickDay(10);
      clickDay(15);
      clickEndHour('18:00');

      expect(isStartHourSelected('00:00')).toBe(true);
    });
  });

  describe('hour preservation', () => {
    it('preserves both hours when a new start date is clicked after a complete range', () => {
      renderWithEuiTheme(<CalendarPanel />);

      // Context initializes with 10:00 start and 12:00 end
      clickDay(5); // resets to single-date selection, hours unchanged

      expect(isStartHourSelected('10:00')).toBe(true);
      expect(isEndHourSelected('12:00')).toBe(true);
    });

    it('preserves a custom end hour when re-selecting a new date range', () => {
      mockUseDateRangePickerContext.mockReturnValue(makeContextNoDates());
      renderWithEuiTheme(<CalendarPanel />);

      clickDay(10);
      clickDay(15);
      clickEndHour('06:00'); // user explicitly sets end time

      clickDay(20); // start a new range
      clickDay(25); // complete it

      // user's chosen end hour must survive date re-selection
      expect(isEndHourSelected('06:00')).toBe(true);
    });
  });

  describe('Apply', () => {
    it('is disabled when no dates are selected', () => {
      mockUseDateRangePickerContext.mockReturnValue(makeContextNoDates());
      renderWithEuiTheme(<CalendarPanel />);

      expect(screen.getByRole('button', { name: 'Apply' })).toBeDisabled();
    });

    it('is disabled when only the start date is selected', () => {
      mockUseDateRangePickerContext.mockReturnValue(makeContextNoDates());
      renderWithEuiTheme(<CalendarPanel />);

      clickDay(10);

      expect(screen.getByRole('button', { name: 'Apply' })).toBeDisabled();
    });

    it('is disabled when start is after end (same date, start hour > end hour)', () => {
      mockUseDateRangePickerContext.mockReturnValue(makeContextNoDates());
      renderWithEuiTheme(<CalendarPanel />);

      clickDay(10);
      clickDay(10); // same date for start and end
      clickStartHour('18:00');
      clickEndHour('09:00'); // end before start

      expect(screen.getByRole('button', { name: 'Apply' })).toBeDisabled();
    });

    it('is enabled when initialized with computed dates', () => {
      renderWithEuiTheme(<CalendarPanel />);

      expect(screen.getByRole('button', { name: 'Apply' })).not.toBeDisabled();
    });

    it('is enabled when initialized with a relative timeRange that has computed dates', () => {
      mockUseDateRangePickerContext.mockReturnValue(
        makeContext([DATE_TYPE_RELATIVE, DATE_TYPE_NOW])
      );
      renderWithEuiTheme(<CalendarPanel />);

      expect(screen.getByRole('button', { name: 'Apply' })).not.toBeDisabled();
    });

    it('becomes enabled after both dates are selected', () => {
      mockUseDateRangePickerContext.mockReturnValue(makeContextNoDates());
      renderWithEuiTheme(<CalendarPanel />);

      expect(screen.getByRole('button', { name: 'Apply' })).toBeDisabled();

      clickDay(10);
      expect(screen.getByRole('button', { name: 'Apply' })).toBeDisabled();

      clickDay(15);
      expect(screen.getByRole('button', { name: 'Apply' })).not.toBeDisabled();
    });

    it('calls applyRange with correct UTC ISO start and end bounds', () => {
      mockUseDateRangePickerContext.mockReturnValue(makeContextNoDates());
      renderWithEuiTheme(<CalendarPanel />);

      clickDay(10);
      clickDay(15);
      fireEvent.click(screen.getByRole('button', { name: 'Apply' }));

      expect(applyRange).toHaveBeenCalledWith({
        start: new Date(2026, 1, 10, 0, 0).toISOString(),
        end: new Date(2026, 1, 15, 23, 30).toISOString(),
      });
    });

    it('calls onPresetSave when Save as preset is checked', () => {
      mockUseDateRangePickerContext.mockReturnValue(makeContextNoDates());
      renderWithEuiTheme(<CalendarPanel />);

      fireEvent.click(screen.getByRole('checkbox', { name: 'Save as preset' }));
      clickDay(10);
      clickDay(15);
      fireEvent.click(screen.getByRole('button', { name: 'Apply' }));

      expect(onPresetSave).toHaveBeenCalledWith(
        expect.objectContaining({ label: expect.any(String) })
      );
    });

    it('does not call onPresetSave when Save as preset is unchecked', () => {
      mockUseDateRangePickerContext.mockReturnValue(makeContextNoDates());
      renderWithEuiTheme(<CalendarPanel />);

      clickDay(10);
      clickDay(15);
      fireEvent.click(screen.getByRole('button', { name: 'Apply' }));

      expect(onPresetSave).not.toHaveBeenCalled();
    });
  });

  describe('input text → calendar/pickers sync', () => {
    /**
     * Simulate the user editing the input: update the mock context so it returns new text +
     * timeRange, then rerender.  In the real app, typing calls setText which flows back via
     * the context; here we replicate that by re-providing the context values.
     */
    const simulateTextChange = (
      rerender: (ui: React.ReactElement) => void,
      newText: string,
      newStartDate: Date,
      newEndDate: Date
    ) => {
      mockUseDateRangePickerContext.mockReturnValue({
        applyRange,
        onPresetSave,
        setText,
        text: newText,
        timeRange: {
          startDate: newStartDate,
          endDate: newEndDate,
          type: [DATE_TYPE_ABSOLUTE, DATE_TYPE_ABSOLUTE] as [string, string],
          isInvalid: false,
        },
      });
      rerender(<CalendarPanel />);
    };

    it('updates the hour pickers when the user types a valid range into the input', () => {
      const { rerender } = renderWithEuiTheme(<CalendarPanel />);

      // Start is 10:00, end is 12:00 from makeContext
      expect(isStartHourSelected('10:00')).toBe(true);
      expect(isEndHourSelected('12:00')).toBe(true);

      // User types a new range: Feb 5 09:00 → Feb 10 17:30
      const newStart = new Date(2026, 1, 5, 9, 0);
      const newEnd = new Date(2026, 1, 10, 17, 30);
      simulateTextChange(rerender, isoRange(feb2026Local(5, 9, 0), feb2026Local(10, 17, 30)), newStart, newEnd);

      expect(isStartHourSelected('09:00')).toBe(true);
      expect(isEndHourSelected('17:30')).toBe(true);
    });

    it('marks the pickers as approximate when the typed time is not on a half-hour boundary', () => {
      const { rerender } = renderWithEuiTheme(<CalendarPanel />);

      // User types a time with sub-half-hour precision: 14:17
      const newStart = new Date(2026, 1, 5, 14, 17);
      const newEnd = new Date(2026, 1, 10, 18, 0);
      simulateTextChange(rerender, isoRange(feb2026Local(5, 14, 17), feb2026Local(10, 18, 0)), newStart, newEnd);

      // 14:17 → rounds to 14:30 (approximate)
      expect(
        within(getStartPicker()).getByRole('button', { name: '14:30' }).getAttribute('data-approximate')
      ).toBe('true');
      // 18:00 is exact
      expect(
        within(getEndPicker()).getByRole('button', { name: '18:00' }).getAttribute('data-approximate')
      ).toBeNull();
    });

    it('does not update the pickers when the typed text is invalid', () => {
      mockUseDateRangePickerContext.mockReturnValue(makeContext([DATE_TYPE_ABSOLUTE, DATE_TYPE_ABSOLUTE]));
      const { rerender } = renderWithEuiTheme(<CalendarPanel />);

      // Pickers start at 10:00 / 12:00
      expect(isStartHourSelected('10:00')).toBe(true);

      // Simulate invalid text (context text changes but timeRange is invalid)
      mockUseDateRangePickerContext.mockReturnValue({
        applyRange,
        onPresetSave,
        setText,
        text: 'not a valid range',
        timeRange: {
          startDate: null,
          endDate: null,
          type: [DATE_TYPE_ABSOLUTE, DATE_TYPE_ABSOLUTE] as [string, string],
          isInvalid: true,
        },
      });
      rerender(<CalendarPanel />);

      // Pickers must stay at the last valid state
      expect(isStartHourSelected('10:00')).toBe(true);
      expect(isEndHourSelected('12:00')).toBe(true);
    });

    it('clears the approximate indicator when the user types an exact half-hour', () => {
      mockUseDateRangePickerContext.mockReturnValue(makeContextApproximate());
      const { rerender } = renderWithEuiTheme(<CalendarPanel />);

      // Initially approximate (10:18 → 10:30 with light bg)
      expect(
        within(getStartPicker()).getByRole('button', { name: '10:30' }).getAttribute('data-approximate')
      ).toBe('true');

      // User manually types an exact half-hour
      const newStart = new Date(2026, 1, 1, 10, 30, 0, 0);
      const newEnd = new Date(2026, 1, 2, 10, 38);
      simulateTextChange(
        rerender,
        isoRange(feb2026Local(1, 10, 30), toLocalPrecise(newEnd)),
        newStart,
        newEnd
      );

      // 10:30 is now exact → filled button
      expect(
        within(getStartPicker()).getByRole('button', { name: '10:30' }).getAttribute('data-approximate')
      ).toBeNull();
    });
  });
});
