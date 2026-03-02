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

const virtuosoScrollToIndexMock = jest.fn();

jest.mock('./calendar_view', () => ({
  CalendarView: ({ month }: { month: Date }) => (
    <div data-test-subj="calendarView">{month.toISOString().slice(0, 7)}</div>
  ),
}));

jest.mock('react-virtuoso', () => {
  const ReactLib = require('react');
  return {
    Virtuoso: ReactLib.forwardRef((props: any, ref: any) => {
      if (ref) {
        ref.current = { scrollToIndex: virtuosoScrollToIndexMock };
      }
      return (
        <div data-test-subj="virtuosoMock">
          <button data-test-subj="startReached" onClick={() => props.startReached?.()} />
          <button data-test-subj="endReached" onClick={() => props.endReached?.()} />
          <button
            data-test-subj="visibleToday"
            onClick={() => props.rangeChanged?.({ startIndex: 0, endIndex: 0 })}
          />
          <button
            data-test-subj="hiddenToday"
            onClick={() => props.rangeChanged?.({ startIndex: 1, endIndex: 2 })}
          />
          <div data-test-subj="itemContent">{props.itemContent?.(0)}</div>
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
    virtuosoScrollToIndexMock.mockClear();
  });

  it('renders months through Virtuoso itemContent using current-month anchor', () => {
    renderWithEuiTheme(<Calendar {...defaultProps} />);

    expect(screen.getByTestId('calendarView')).toBeInTheDocument();
  });

  it('shows Today button when current date/month is outside visible range', () => {
    renderWithEuiTheme(<Calendar {...defaultProps} />);

    fireEvent.click(screen.getByTestId('hiddenToday'));

    expect(screen.getByRole('button', { name: 'Today' })).toBeInTheDocument();
  });

  it('hides Today button when current date/month is inside visible range', () => {
    renderWithEuiTheme(<Calendar {...defaultProps} />);

    fireEvent.click(screen.getByTestId('hiddenToday'));
    expect(screen.getByRole('button', { name: 'Today' })).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('visibleToday'));
    expect(screen.queryByRole('button', { name: 'Today' })).not.toBeInTheDocument();
  });

  it('clicking Today calls scrollToIndex with smooth behavior', () => {
    renderWithEuiTheme(<Calendar {...defaultProps} />);

    fireEvent.click(screen.getByTestId('hiddenToday'));
    fireEvent.click(screen.getByRole('button', { name: 'Today' }));

    expect(virtuosoScrollToIndexMock).toHaveBeenCalledWith(
      expect.objectContaining({
        behavior: 'smooth',
        align: 'start',
      })
    );
  });
});

