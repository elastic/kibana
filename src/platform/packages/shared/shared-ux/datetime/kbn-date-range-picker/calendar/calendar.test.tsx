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
import type { DateRange } from 'react-day-picker';

import { Calendar } from './calendar';

const mockScrollToIndex = jest.fn();

jest.mock('./calendar_view', () => ({
  CalendarView: ({ month }: { month: Date }) => {
    const year = month.getFullYear();
    const monthNum = String(month.getMonth() + 1).padStart(2, '0');

    return (
      <div data-test-subj="calendar-view" data-month={`${year}-${monthNum}`}>
        {month.toLocaleString('default', { month: 'long', year: 'numeric' })}
      </div>
    );
  },
}));

jest.mock('react-virtuoso', () => {
  const mockReact = jest.requireActual('react');
  const { TODAY_INDEX } = jest.requireActual('./calendar.constants');

  const VISIBLE_RANGE = {
    PAST_MONTHS: { startIndex: TODAY_INDEX - 10, endIndex: TODAY_INDEX - 5 },
    TODAY_VISIBLE: { startIndex: TODAY_INDEX - 1, endIndex: TODAY_INDEX + 1 },
    FUTURE_MONTHS: { startIndex: TODAY_INDEX + 5, endIndex: TODAY_INDEX + 10 },
  };

  return {
    Virtuoso: mockReact.forwardRef(function MockVirtuoso(
      props: {
        itemContent: (index: number) => React.ReactNode;
        rangeChanged?: (range: { startIndex: number; endIndex: number }) => void;
      },
      ref: React.Ref<unknown>
    ) {
      mockReact.useImperativeHandle(ref, () => ({
        scrollToIndex: (...args: unknown[]) => mockScrollToIndex(...args),
      }));

      return (
        <div data-test-subj="virtuoso">
          {props.itemContent(TODAY_INDEX)}
          <button
            data-test-subj="simulate-scroll-future"
            onClick={() => props.rangeChanged?.(VISIBLE_RANGE.FUTURE_MONTHS)}
          />
          <button
            data-test-subj="simulate-scroll-past"
            onClick={() => props.rangeChanged?.(VISIBLE_RANGE.PAST_MONTHS)}
          />
          <button
            data-test-subj="simulate-scroll-today"
            onClick={() => props.rangeChanged?.(VISIBLE_RANGE.TODAY_VISIBLE)}
          />
        </div>
      );
    }),
  };
});

describe('Calendar', () => {
  const defaultProps: { range: DateRange | undefined; onRangeChange: jest.Mock } = {
    range: undefined,
    onRangeChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders for the current month', () => {
    renderWithEuiTheme(<Calendar {...defaultProps} />);

    const calendarView = screen.getByTestId('calendar-view');

    expect(calendarView).toBeInTheDocument();

    const now = new Date();
    const expectedMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    expect(calendarView).toHaveAttribute('data-month', expectedMonth);
  });

  describe('"Today" button', () => {
    describe('visibility', () => {
      it('does not show Today button when today is visible', () => {
        renderWithEuiTheme(<Calendar {...defaultProps} />);

        expect(screen.queryByRole('button', { name: 'Today' })).not.toBeInTheDocument();
      });

      it('shows Today button when scrolled into future months', () => {
        renderWithEuiTheme(<Calendar {...defaultProps} />);

        fireEvent.click(screen.getByTestId('simulate-scroll-future'));

        expect(screen.getByRole('button', { name: 'Today' })).toBeInTheDocument();
      });

      it('shows Today button when scrolled into past months', () => {
        renderWithEuiTheme(<Calendar {...defaultProps} />);

        fireEvent.click(screen.getByTestId('simulate-scroll-past'));

        expect(screen.getByRole('button', { name: 'Today' })).toBeInTheDocument();
      });

      it('hides Today button when scrolling back to today', () => {
        renderWithEuiTheme(<Calendar {...defaultProps} />);

        fireEvent.click(screen.getByTestId('simulate-scroll-past'));

        expect(screen.getByRole('button', { name: 'Today' })).toBeInTheDocument();

        fireEvent.click(screen.getByTestId('simulate-scroll-today'));

        expect(screen.queryByRole('button', { name: 'Today' })).not.toBeInTheDocument();
      });
    });

    describe('interaction', () => {
      it('calls scrollToIndex when Today button is clicked', () => {
        renderWithEuiTheme(<Calendar {...defaultProps} />);

        fireEvent.click(screen.getByTestId('simulate-scroll-past'));
        fireEvent.click(screen.getByRole('button', { name: 'Today' }));

        expect(mockScrollToIndex).toHaveBeenCalledWith(
          expect.objectContaining({
            behavior: 'smooth',
            align: 'center',
          })
        );
      });
    });

    describe('icon direction', () => {
      it('shows `sortUp` icon when viewing future months (scroll backward to reach today)', () => {
        renderWithEuiTheme(<Calendar {...defaultProps} />);

        fireEvent.click(screen.getByTestId('simulate-scroll-future'));

        const todayButton = screen.getByRole('button', { name: 'Today' });
        const icon = todayButton.querySelector('[data-euiicon-type="sortUp"]');

        expect(icon).toBeInTheDocument();
      });

      it('shows `sortDown` icon when viewing past months (scroll forward to reach today)', () => {
        renderWithEuiTheme(<Calendar {...defaultProps} />);

        fireEvent.click(screen.getByTestId('simulate-scroll-past'));

        const todayButton = screen.getByRole('button', { name: 'Today' });
        const icon = todayButton.querySelector('[data-euiicon-type="sortDown"]');

        expect(icon).toBeInTheDocument();
      });
    });
  });
});
