/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { type MutableRefObject } from 'react';
import { fireEvent, screen } from '@testing-library/react';
import { renderWithEuiTheme } from '@kbn/test-jest-helpers';

import { DateRangePickerDialog } from './date_range_picker_dialog';

const mockSetIsEditing = jest.fn();
const mockPanelRef: MutableRefObject<HTMLElement | null> = { current: null };

jest.mock('./date_range_picker_context', () => ({
  useDateRangePickerContext: () => ({
    isEditing: true,
    setIsEditing: mockSetIsEditing,
    panelRef: mockPanelRef,
    panelId: 'test-panel',
    width: 'auto' as const,
  }),
}));

jest.mock('./date_range_picker_control', () => ({
  DateRangePickerControl: () => <button>Open picker</button>,
}));

// Simulates CalendarPanel: header, day buttons, and footer.
// `day-1` uses `tabIndex={0}` to allow focus (matches react-day-picker's expected pattern).
const TestChildren = () => (
  <>
    <button data-test-subj="header-button">Back</button>
    <div data-calendar-scroller>
      <button data-test-subj="day-1" tabIndex={0}>
        1
      </button>
      <button data-test-subj="day-2" tabIndex={-1}>
        2
      </button>
    </div>
    <button data-test-subj="footer-button">Apply</button>
  </>
);

describe('DateRangePickerDialog', () => {
  beforeEach(() => {
    mockSetIsEditing.mockClear();
  });

  describe('Tab out of calendar', () => {
    it('Tab from a day button moves focus to the first element after the calendar', () => {
      renderWithEuiTheme(
        <DateRangePickerDialog>
          <TestChildren />
        </DateRangePickerDialog>
      );

      screen.getByTestId('day-1').focus();
      fireEvent.keyDown(screen.getByTestId('day-1'), { key: 'Tab' });

      expect(screen.getByTestId('footer-button')).toHaveFocus();
    });

    it('Shift+Tab from a day button moves focus to the last element before the calendar', () => {
      renderWithEuiTheme(
        <DateRangePickerDialog>
          <TestChildren />
        </DateRangePickerDialog>
      );

      screen.getByTestId('day-1').focus();
      fireEvent.keyDown(screen.getByTestId('day-1'), { key: 'Tab', shiftKey: true });

      expect(screen.getByTestId('header-button')).toHaveFocus();
    });
  });

  describe('Tab into calendar', () => {
    it('Tab from the element before the calendar restores the last focused day', () => {
      renderWithEuiTheme(
        <DateRangePickerDialog>
          <TestChildren />
        </DateRangePickerDialog>
      );

      // First visit: Tab out of calendar saves day-1 in the ref.
      screen.getByTestId('day-1').focus();
      fireEvent.keyDown(screen.getByTestId('day-1'), { key: 'Tab' });
      expect(screen.getByTestId('footer-button')).toHaveFocus();

      // Navigate back to the element before the calendar.
      screen.getByTestId('header-button').focus();

      // Tab from header should restore focus to the previously focused day.
      fireEvent.keyDown(screen.getByTestId('header-button'), { key: 'Tab' });
      expect(screen.getByTestId('day-1')).toHaveFocus();
    });

    it('Shift+Tab from the element after the calendar restores the last focused day', () => {
      renderWithEuiTheme(
        <DateRangePickerDialog>
          <TestChildren />
        </DateRangePickerDialog>
      );

      // First visit: Shift+Tab out of calendar saves day-1 in the ref.
      screen.getByTestId('day-1').focus();
      fireEvent.keyDown(screen.getByTestId('day-1'), { key: 'Tab', shiftKey: true });
      expect(screen.getByTestId('header-button')).toHaveFocus();

      // Shift+Tab from footer should restore focus to the previously focused day.
      screen.getByTestId('footer-button').focus();
      fireEvent.keyDown(screen.getByTestId('footer-button'), { key: 'Tab', shiftKey: true });
      expect(screen.getByTestId('day-1')).toHaveFocus();
    });

    it('Tab from the element before the calendar falls back to the tabindex=0 day on first visit', () => {
      renderWithEuiTheme(
        <DateRangePickerDialog>
          <TestChildren />
        </DateRangePickerDialog>
      );

      // No prior visit - ref is empty, falls back to querySelector('[tabindex="0"]').
      screen.getByTestId('header-button').focus();
      fireEvent.keyDown(screen.getByTestId('header-button'), { key: 'Tab' });

      expect(screen.getByTestId('day-1')).toHaveFocus();
    });
  });
});
