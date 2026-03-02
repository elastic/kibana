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

const useDateRangePickerContextMock = jest.fn();

jest.mock('../date_range_picker_context', () => ({
  useDateRangePickerContext: () => useDateRangePickerContextMock(),
}));

jest.mock('../calendar', () => ({
  Calendar: ({ onRangeChange }: { onRangeChange: (value: any) => void }) => (
    <div>
      <button
        data-test-subj="selectRange"
        onClick={() =>
          onRangeChange({
            from: new Date('2026-02-01T00:00:00.000Z'),
            to: new Date('2026-02-01T00:00:00.000Z'),
          })
        }
      />
    </div>
  ),
  HourPicker: ({
    selectedHour,
    onHourChange,
  }: {
    selectedHour: string | undefined;
    onHourChange: (hour: string) => void;
  }) => (
    <div>
      <div data-test-subj="selectedHour">{selectedHour ?? 'none'}</div>
      <button data-test-subj="setStartHour" onClick={() => onHourChange('23:30')} />
      <button data-test-subj="setEndHour" onClick={() => onHourChange('0:00')} />
      <button data-test-subj="setValidEndHour" onClick={() => onHourChange('23:30')} />
    </div>
  ),
}));

describe('CalendarPanel', () => {
  const applyRange = jest.fn();
  const onPresetSave = jest.fn();
  const setText = jest.fn();

  beforeEach(() => {
    applyRange.mockClear();
    onPresetSave.mockClear();
    setText.mockClear();
    useDateRangePickerContextMock.mockReturnValue({
      applyRange,
      onPresetSave,
      setText,
      timeRange: {
        startDate: new Date('2026-02-01T10:00:00.000Z'),
        endDate: new Date('2026-02-02T12:00:00.000Z'),
      },
    });
  });

  it('initializes selected range and hours from existing absolute timeRange', () => {
    renderWithEuiTheme(<CalendarPanel />);

    expect(screen.getByTestId('selectedHour')).toHaveTextContent('10:00');
  });

  it('updates preview text via setText when range and hours are complete', () => {
    renderWithEuiTheme(<CalendarPanel />);

    fireEvent.click(screen.getByTestId('selectRange'));
    fireEvent.click(screen.getByTestId('setStartHour'));
    fireEvent.click(screen.getByTestId('setValidEndHour'));

    expect(setText).toHaveBeenCalled();
  });

  it('blocks applyRange when assembled range is invalid (end before start)', () => {
    renderWithEuiTheme(<CalendarPanel />);

    fireEvent.click(screen.getByTestId('selectRange'));
    fireEvent.click(screen.getByTestId('setStartHour'));
    fireEvent.click(screen.getByTestId('setEndHour'));
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));

    expect(applyRange).not.toHaveBeenCalled();
  });

  it('calls applyRange with expected ISO bounds for valid selection', () => {
    renderWithEuiTheme(<CalendarPanel />);

    fireEvent.click(screen.getByTestId('selectRange'));
    fireEvent.click(screen.getByTestId('setStartHour'));
    fireEvent.click(screen.getByTestId('setValidEndHour'));
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));

    expect(applyRange).toHaveBeenCalledWith(
      expect.objectContaining({
        start: expect.any(String),
        end: expect.any(String),
      })
    );
  });

  it('calls onPresetSave when Save as preset is checked', () => {
    renderWithEuiTheme(<CalendarPanel />);

    fireEvent.click(screen.getByRole('checkbox', { name: 'Save as preset' }));
    fireEvent.click(screen.getByTestId('selectRange'));
    fireEvent.click(screen.getByTestId('setStartHour'));
    fireEvent.click(screen.getByTestId('setValidEndHour'));
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));

    expect(onPresetSave).toHaveBeenCalledWith(
      expect.objectContaining({
        label: expect.any(String),
      })
    );
  });
});

