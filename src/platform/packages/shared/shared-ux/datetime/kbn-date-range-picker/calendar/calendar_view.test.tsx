/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { renderWithEuiTheme } from '@kbn/test-jest-helpers';

import { CalendarView } from './calendar_view';

const mockDayPicker = jest.fn();

jest.mock('react-day-picker', () => ({
  DayPicker: (props: object) => {
    mockDayPicker(props);
    return <div data-test-subj="dayPickerMock" />;
  },
}));

describe('CalendarView', () => {
  beforeEach(() => {
    mockDayPicker.mockClear();
  });

  it('passes DayPicker mode="range" and selected range props', () => {
    const range = {
      from: new Date('2026-02-01T00:00:00.000Z'),
      to: new Date('2026-02-10T00:00:00.000Z'),
    };
    const setRange = jest.fn();

    renderWithEuiTheme(
      <CalendarView
        month={new Date('2026-02-01T00:00:00.000Z')}
        range={range}
        setRange={setRange}
      />
    );

    expect(mockDayPicker).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'range',
        selected: range,
        onSelect: setRange,
      })
    );
  });

  it('applies supported DayPicker styles API', () => {
    renderWithEuiTheme(
      <CalendarView
        month={new Date('2026-02-01T00:00:00.000Z')}
        range={undefined}
        setRange={() => {}}
      />
    );

    expect(mockDayPicker).toHaveBeenCalledWith(
      expect.objectContaining({
        styles: expect.objectContaining({
          root: expect.objectContaining({
            width: '100%',
          }),
          month: expect.objectContaining({
            padding: expect.any(String),
          }),
          month_caption: expect.objectContaining({
            display: 'flex',
            justifyContent: 'center',
          }),
        }),
      })
    );
  });
});
