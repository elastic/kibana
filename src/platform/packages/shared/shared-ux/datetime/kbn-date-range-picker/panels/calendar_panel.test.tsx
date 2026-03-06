/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { fireEvent, screen } from '@testing-library/react';
import { renderWithEuiTheme } from '@kbn/test-jest-helpers';

import { CalendarPanel } from './calendar_panel';
import { DATE_TYPE_ABSOLUTE, DATE_TYPE_NOW, DATE_TYPE_RELATIVE } from '../constants';
import { formatDateRange, toLocalPreciseString } from '../utils';

const mockUseDateRangePickerContext = jest.fn();

jest.mock('../date_range_picker_context', () => ({
  useDateRangePickerContext: () => mockUseDateRangePickerContext(),
}));

jest.mock('../date_range_picker_panel_ui', () => ({
  PanelContainer: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  PanelHeader: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  PanelBody: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  PanelFooter: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SubPanelHeading: ({
    children,
    onGoBack,
  }: {
    children: React.ReactNode;
    onGoBack?: () => void;
  }) => (
    <button data-test-subj="back-button" onClick={onGoBack}>
      {children}
    </button>
  ),
}));

/**
 * Calendar mock: renders numbered day buttons for February 2026 (days 1-28).
 * Clicking a day simulates DayPicker's range selection state machine using the
 * current `range` prop.
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

  return { Calendar: MockCalendar };
});

/** Creates a Date for Feb 2026 with the given components. */
const feb2026 = (day: number, h: number, m: number, s = 0, ms = 0) =>
  new Date(2026, 1, day, h, m, s, ms);

/** Builds the local-precise string for a given Feb 2026 date. */
const feb2026Local = (day: number, h: number, m: number, s = 0, ms = 0) =>
  toLocalPreciseString(feb2026(day, h, m, s, ms));

/** Click a day by its number in the February 2026 calendar. */
const clickDay = (day: number) =>
  fireEvent.click(screen.getByRole('button', { name: String(day) }));

describe('CalendarPanel', () => {
  const applyRange = jest.fn();
  const onPresetSave = jest.fn();
  const setText = jest.fn();

  /** Context with computed dates. */
  const makeContext = (
    type: [string, string],
    startDate = new Date(2026, 1, 1, 10, 15, 30, 500),
    endDate = new Date(2026, 1, 2, 12, 45, 0, 0)
  ) => ({
    applyRange,
    onPresetSave,
    setText,
    text: formatDateRange(startDate, endDate),
    timeRange: {
      startDate,
      endDate,
      type,
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
    it('converts to absolute format on mount', () => {
      renderWithEuiTheme(<CalendarPanel />);

      expect(setText).toHaveBeenCalledWith(
        formatDateRange(feb2026(1, 10, 15, 30, 500), feb2026(2, 12, 45, 0, 0))
      );
    });

    it('does not call setText on mount when no dates are available', () => {
      mockUseDateRangePickerContext.mockReturnValue(makeContextNoDates());
      renderWithEuiTheme(<CalendarPanel />);

      expect(setText).not.toHaveBeenCalled();
    });
  });

  describe('time preservation', () => {
    it('preserves original times when selecting new dates', () => {
      mockUseDateRangePickerContext.mockReturnValue(
        makeContext(
          [DATE_TYPE_ABSOLUTE, DATE_TYPE_ABSOLUTE],
          new Date(2026, 1, 1, 14, 30, 45, 123),
          new Date(2026, 1, 2, 18, 15, 30, 456)
        )
      );
      renderWithEuiTheme(<CalendarPanel />);

      clickDay(10);
      clickDay(15);

      expect(setText).toHaveBeenLastCalledWith(
        formatDateRange(feb2026(10, 14, 30, 45, 123), feb2026(15, 18, 15, 30, 456))
      );
    });

    it('orders times correctly when selecting same day with start time > end time', () => {
      mockUseDateRangePickerContext.mockReturnValue(
        makeContext(
          [DATE_TYPE_ABSOLUTE, DATE_TYPE_ABSOLUTE],
          new Date(2026, 1, 1, 20, 0, 0, 0),
          new Date(2026, 1, 2, 8, 0, 0, 0)
        )
      );
      renderWithEuiTheme(<CalendarPanel />);

      clickDay(10);
      clickDay(10);

      expect(setText).toHaveBeenLastCalledWith(
        formatDateRange(feb2026(10, 8, 0, 0, 0), feb2026(10, 20, 0, 0, 0))
      );
    });
  });

  describe('date selection', () => {
    it('calls setText with just the start date when only the first date is clicked', () => {
      mockUseDateRangePickerContext.mockReturnValue(makeContextNoDates());
      renderWithEuiTheme(<CalendarPanel />);

      clickDay(10);

      expect(setText).toHaveBeenCalledWith(feb2026Local(10, 0, 0));
    });

    it('calls setText with the full local-precise range after both dates are selected', () => {
      mockUseDateRangePickerContext.mockReturnValue(makeContextNoDates());
      renderWithEuiTheme(<CalendarPanel />);

      clickDay(10);
      clickDay(15);

      expect(setText).toHaveBeenLastCalledWith(
        formatDateRange(feb2026(10, 0, 0), feb2026(15, 23, 30))
      );
    });

    it('resets range and shows new start date when clicking after a complete selection', () => {
      mockUseDateRangePickerContext.mockReturnValue(
        makeContext(
          [DATE_TYPE_ABSOLUTE, DATE_TYPE_ABSOLUTE],
          new Date(2026, 1, 1, 14, 30, 45, 123),
          new Date(2026, 1, 2, 18, 15, 30, 456)
        )
      );
      renderWithEuiTheme(<CalendarPanel />);

      clickDay(20);

      expect(setText).toHaveBeenCalledWith(feb2026Local(20, 14, 30, 45, 123));
    });
  });

  describe('Apply button', () => {
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

    it('shows tooltip when disabled due to missing end date', () => {
      mockUseDateRangePickerContext.mockReturnValue(makeContextNoDates());
      renderWithEuiTheme(<CalendarPanel />);

      clickDay(10);

      const applyButton = screen.getByRole('button', { name: 'Apply' });
      expect(
        applyButton.closest('[class*="euiToolTip"]') || applyButton.parentElement
      ).toBeTruthy();
    });

    it('is disabled when initialized with dates but no changes made', () => {
      renderWithEuiTheme(<CalendarPanel />);

      expect(screen.getByRole('button', { name: 'Apply' })).toBeDisabled();
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

    it('calls applyRange with UTC ISO bounds and local display text', () => {
      mockUseDateRangePickerContext.mockReturnValue(makeContextNoDates());
      renderWithEuiTheme(<CalendarPanel />);

      clickDay(10);
      clickDay(15);
      fireEvent.click(screen.getByRole('button', { name: 'Apply' }));

      expect(applyRange).toHaveBeenCalledWith(
        {
          start: new Date(2026, 1, 10, 0, 0).toISOString(),
          end: new Date(2026, 1, 15, 23, 30).toISOString(),
        },
        formatDateRange(feb2026(10, 0, 0), feb2026(15, 23, 30))
      );
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

  describe('back navigation', () => {
    it('restores original text when going back', () => {
      const originalText = 'Last 15 minutes';

      mockUseDateRangePickerContext.mockReturnValue({
        ...makeContext([DATE_TYPE_RELATIVE, DATE_TYPE_NOW]),
        text: originalText,
      });

      renderWithEuiTheme(<CalendarPanel />);

      setText.mockClear();

      fireEvent.click(screen.getByTestId('back-button'));

      expect(setText).toHaveBeenCalledWith(originalText);
    });
  });
});
