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

jest.mock('./calendar_view', () => ({
  CalendarView: ({ year, monthIndex }: { year: number; monthIndex: number }) => {
    const monthNum = String(monthIndex + 1).padStart(2, '0');
    const month = new Date(year, monthIndex, 1);

    return (
      <div data-test-subj="calendar-view" data-month={`${year}-${monthNum}`}>
        {month.toLocaleString('default', { month: 'long', year: 'numeric' })}
      </div>
    );
  },
}));

const TEST_MONTH_HEIGHT = 280;
const TEST_VIEWPORT_MONTHS = 3;
const TEST_TOP_SCROLL = 160;
const TEST_BOTTOM_OFFSET = 160;

function mockScrollerLayout() {
  const scroller = screen.getByTestId('dateRangePickerCalendarScroller');
  const monthItems = Array.from(scroller.querySelectorAll<HTMLElement>('[data-month-index]'));
  const totalHeight = monthItems.length * TEST_MONTH_HEIGHT;
  let scrollTop = TEST_MONTH_HEIGHT * 17;

  Object.defineProperty(scroller, 'clientHeight', {
    configurable: true,
    get: () => TEST_MONTH_HEIGHT * TEST_VIEWPORT_MONTHS,
  });
  Object.defineProperty(scroller, 'scrollHeight', {
    configurable: true,
    get: () => totalHeight,
  });
  Object.defineProperty(scroller, 'scrollTop', {
    configurable: true,
    get: () => scrollTop,
    set: (value: number) => {
      scrollTop = value;
    },
  });

  monthItems.forEach((monthItem, index) => {
    Object.defineProperty(monthItem, 'offsetTop', {
      configurable: true,
      get: () => index * TEST_MONTH_HEIGHT,
    });
    Object.defineProperty(monthItem, 'offsetHeight', {
      configurable: true,
      get: () => TEST_MONTH_HEIGHT,
    });
  });

  const scrollToSpy = jest.fn(({ top }: { top?: number }) => {
    if (typeof top === 'number') {
      scrollTop = top;
    }
  });
  Object.defineProperty(scroller, 'scrollTo', {
    configurable: true,
    value: scrollToSpy,
  });

  fireEvent.scroll(scroller);

  return {
    scroller,
    monthItemsCount: monthItems.length,
    getScrollTop: () => scrollTop,
    setScrollTop: (nextTop: number) => {
      scrollTop = nextTop;
    },
    scrollToSpy,
  };
}

describe('Calendar', () => {
  const defaultProps: { range: DateRange | undefined; onRangeChange: jest.Mock } = {
    range: undefined,
    onRangeChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the current month inside the mounted window', () => {
    renderWithEuiTheme(<Calendar {...defaultProps} />);

    const calendarViews = screen.getAllByTestId('calendar-view');
    const now = new Date();
    const expectedMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    expect(
      calendarViews.some(
        (calendarView) => calendarView.getAttribute('data-month') === expectedMonth
      )
    ).toBe(true);
  });

  describe('"Today" button', () => {
    describe('visibility', () => {
      it('does not show Today button when today is visible', () => {
        renderWithEuiTheme(<Calendar {...defaultProps} />);
        mockScrollerLayout();

        expect(screen.queryByRole('button', { name: 'Today' })).not.toBeInTheDocument();
      });

      it('shows Today button when scrolled into future months', () => {
        renderWithEuiTheme(<Calendar {...defaultProps} />);
        const { scroller, monthItemsCount, setScrollTop } = mockScrollerLayout();
        const viewportHeight = TEST_MONTH_HEIGHT * TEST_VIEWPORT_MONTHS;
        const bottomScrollTop =
          monthItemsCount * TEST_MONTH_HEIGHT - viewportHeight - TEST_BOTTOM_OFFSET;

        setScrollTop(bottomScrollTop);
        fireEvent.scroll(scroller);

        expect(screen.getByRole('button', { name: 'Today' })).toBeInTheDocument();
      });

      it('shows Today button when scrolled into past months', () => {
        renderWithEuiTheme(<Calendar {...defaultProps} />);
        const { scroller, setScrollTop } = mockScrollerLayout();

        setScrollTop(TEST_TOP_SCROLL);
        fireEvent.scroll(scroller);

        expect(screen.getByRole('button', { name: 'Today' })).toBeInTheDocument();
      });

      it('hides Today button when scrolling back to today', () => {
        renderWithEuiTheme(<Calendar {...defaultProps} />);
        const { scroller, setScrollTop } = mockScrollerLayout();

        setScrollTop(TEST_TOP_SCROLL);
        fireEvent.scroll(scroller);

        expect(screen.getByRole('button', { name: 'Today' })).toBeInTheDocument();

        setScrollTop(TEST_MONTH_HEIGHT * 17);
        fireEvent.scroll(scroller);

        expect(screen.queryByRole('button', { name: 'Today' })).not.toBeInTheDocument();
      });
    });

    describe('interaction', () => {
      it('scrolls to today when Today button is clicked', () => {
        renderWithEuiTheme(<Calendar {...defaultProps} />);
        const { scroller, setScrollTop, scrollToSpy } = mockScrollerLayout();

        setScrollTop(TEST_TOP_SCROLL);
        fireEvent.scroll(scroller);
        fireEvent.click(screen.getByRole('button', { name: 'Today' }));

        expect(scrollToSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            behavior: 'auto',
          })
        );
      });
    });

    describe('icon direction', () => {
      it('shows `sortUp` icon when viewing future months (scroll backward to reach today)', () => {
        renderWithEuiTheme(<Calendar {...defaultProps} />);
        const { scroller, monthItemsCount, setScrollTop } = mockScrollerLayout();
        const viewportHeight = TEST_MONTH_HEIGHT * TEST_VIEWPORT_MONTHS;
        const bottomScrollTop =
          monthItemsCount * TEST_MONTH_HEIGHT - viewportHeight - TEST_BOTTOM_OFFSET;

        setScrollTop(bottomScrollTop);
        fireEvent.scroll(scroller);

        const todayButton = screen.getByRole('button', { name: 'Today' });
        const icon = todayButton.querySelector('[data-euiicon-type="sortUp"]');

        expect(icon).toBeInTheDocument();
      });

      it('shows `sortDown` icon when viewing past months (scroll forward to reach today)', () => {
        renderWithEuiTheme(<Calendar {...defaultProps} />);
        const { scroller, setScrollTop } = mockScrollerLayout();

        setScrollTop(TEST_TOP_SCROLL);
        fireEvent.scroll(scroller);

        const todayButton = screen.getByRole('button', { name: 'Today' });
        const icon = todayButton.querySelector('[data-euiicon-type="sortDown"]');

        expect(icon).toBeInTheDocument();
      });
    });
  });
});
