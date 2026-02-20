/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import moment from 'moment';
import { fireEvent, screen, act } from '@testing-library/react';
import { renderWithEuiTheme } from '@kbn/test-jest-helpers';

import { DateRangePicker, type DateRangePickerProps } from './date_range_picker';
import {
  DEFAULT_ZOOM_FACTOR,
  ZOOM_DELTA_FALLBACK_MS,
} from './date_range_picker_time_window_buttons';

function renderPicker(overrides: Partial<DateRangePickerProps> = {}) {
  const onChange = jest.fn();
  const props: DateRangePickerProps = {
    defaultValue: '-15m to now',
    onChange,
    showTimeWindowButtons: true,
    ...overrides,
  };
  const result = renderWithEuiTheme(<DateRangePicker {...props} />);
  return { onChange, ...result };
}

describe('TimeWindowButtons', () => {
  it('renders time window buttons when showTimeWindowButtons is true', () => {
    renderPicker();
    expect(screen.getByTestId('dateRangePickerTimeWindowButtons')).toBeInTheDocument();
  });

  it('does not render when showTimeWindowButtons is false', () => {
    renderPicker({ showTimeWindowButtons: false });
    expect(screen.queryByTestId('dateRangePickerTimeWindowButtons')).not.toBeInTheDocument();
  });

  it('does not render when showTimeWindowButtons is omitted', () => {
    renderPicker({ showTimeWindowButtons: undefined });
    expect(screen.queryByTestId('dateRangePickerTimeWindowButtons')).not.toBeInTheDocument();
  });

  it('renders 3 buttons by default (previous, zoom out, next)', () => {
    renderPicker();
    const group = screen.getByTestId('dateRangePickerTimeWindowButtons');
    const buttons = group.querySelectorAll('button');
    expect(buttons).toHaveLength(3);
  });

  it('renders 4 buttons when showZoomIn is true', () => {
    renderPicker({ showTimeWindowButtons: { showZoomIn: true } });
    const group = screen.getByTestId('dateRangePickerTimeWindowButtons');
    const buttons = group.querySelectorAll('button');
    expect(buttons).toHaveLength(4);
  });

  it('hides shift arrows when showShiftArrows is false', () => {
    renderPicker({ showTimeWindowButtons: { showShiftArrows: false } });
    const group = screen.getByTestId('dateRangePickerTimeWindowButtons');
    const buttons = group.querySelectorAll('button');
    // Only zoom out remains
    expect(buttons).toHaveLength(1);
  });

  it('hides zoom out when showZoomOut is false', () => {
    renderPicker({ showTimeWindowButtons: { showZoomOut: false } });
    const group = screen.getByTestId('dateRangePickerTimeWindowButtons');
    const buttons = group.querySelectorAll('button');
    // Only previous + next remain
    expect(buttons).toHaveLength(2);
  });

  it('renders nothing when all buttons are hidden', () => {
    renderPicker({
      showTimeWindowButtons: { showShiftArrows: false, showZoomOut: false, showZoomIn: false },
    });
    expect(screen.queryByTestId('dateRangePickerTimeWindowButtons')).not.toBeInTheDocument();
  });

  describe('time shift', () => {
    it('calls onChange when stepping forward', async () => {
      const { onChange } = renderPicker({
        defaultValue: '2025-01-01T00:00:00.000Z to 2025-01-02T00:00:00.000Z',
      });

      await act(async () => {
        fireEvent.click(screen.getByTestId('dateRangePickerNextButton'));
      });

      expect(onChange).toHaveBeenCalledTimes(1);
      const call = onChange.mock.calls[0][0];
      expect(call.start).toBe('2025-01-02T00:00:00.000Z');
      expect(call.end).toBe('2025-01-03T00:00:00.000Z');
    });

    it('calls onChange when stepping backward', async () => {
      const { onChange } = renderPicker({
        defaultValue: '2025-01-02T00:00:00.000Z to 2025-01-03T00:00:00.000Z',
      });

      await act(async () => {
        fireEvent.click(screen.getByTestId('dateRangePickerPreviousButton'));
      });

      expect(onChange).toHaveBeenCalledTimes(1);
      const call = onChange.mock.calls[0][0];
      expect(call.start).toBe('2025-01-01T00:00:00.000Z');
      expect(call.end).toBe('2025-01-02T00:00:00.000Z');
    });
  });

  describe('zoom out', () => {
    const start = '2025-01-01T00:00:00.000Z';
    const end = '2025-01-02T00:00:00.000Z';

    it('expands the window on both ends with default zoom factor', async () => {
      const { onChange } = renderPicker({ defaultValue: `${start} to ${end}` });

      await act(async () => {
        fireEvent.click(screen.getByTestId('dateRangePickerZoomOutButton'));
      });

      const windowMs = moment(end).diff(moment(start));
      const zoomDelta = windowMs * (DEFAULT_ZOOM_FACTOR / 2);
      const expectedStart = moment(start).subtract(zoomDelta, 'ms').toISOString();
      const expectedEnd = moment(end).add(zoomDelta, 'ms').toISOString();

      expect(onChange).toHaveBeenCalledTimes(1);
      const call = onChange.mock.calls[0][0];
      expect(call.start).toBe(expectedStart);
      expect(call.end).toBe(expectedEnd);
    });

    it('accepts a custom zoom factor', async () => {
      const customZoomFactor = 1;
      const { onChange } = renderPicker({
        defaultValue: `${start} to ${end}`,
        showTimeWindowButtons: { zoomFactor: customZoomFactor },
      });

      await act(async () => {
        fireEvent.click(screen.getByTestId('dateRangePickerZoomOutButton'));
      });

      const windowMs = moment(end).diff(moment(start));
      const zoomDelta = windowMs * (customZoomFactor / 2);
      const expectedStart = moment(start).subtract(zoomDelta, 'ms').toISOString();
      const expectedEnd = moment(end).add(zoomDelta, 'ms').toISOString();

      expect(onChange).toHaveBeenCalledTimes(1);
      const call = onChange.mock.calls[0][0];
      expect(call.start).toBe(expectedStart);
      expect(call.end).toBe(expectedEnd);
    });

    it('expands by ZOOM_DELTA_FALLBACK_MS when time window is 0', async () => {
      const sameTime = '2025-01-01T12:00:00.000Z';
      const { onChange } = renderPicker({ defaultValue: `${sameTime} to ${sameTime}` });

      await act(async () => {
        fireEvent.click(screen.getByTestId('dateRangePickerZoomOutButton'));
      });

      const expectedStart = moment(sameTime).subtract(ZOOM_DELTA_FALLBACK_MS, 'ms').toISOString();
      const expectedEnd = moment(sameTime).add(ZOOM_DELTA_FALLBACK_MS, 'ms').toISOString();

      expect(onChange).toHaveBeenCalledTimes(1);
      const call = onChange.mock.calls[0][0];
      expect(call.start).toBe(expectedStart);
      expect(call.end).toBe(expectedEnd);
    });
  });

  describe('zoom in', () => {
    const start = '2025-01-01T00:00:00.000Z';
    const end = '2025-01-02T00:00:00.000Z';

    it('shrinks the window on both ends with default zoom factor', async () => {
      const { onChange } = renderPicker({
        defaultValue: `${start} to ${end}`,
        showTimeWindowButtons: { showZoomIn: true },
      });

      await act(async () => {
        fireEvent.click(screen.getByTestId('dateRangePickerZoomInButton'));
      });

      const windowMs = moment(end).diff(moment(start));
      const zoomDelta = windowMs * (DEFAULT_ZOOM_FACTOR / 2);
      const expectedStart = moment(start).add(zoomDelta, 'ms').toISOString();
      const expectedEnd = moment(end).subtract(zoomDelta, 'ms').toISOString();

      expect(onChange).toHaveBeenCalledTimes(1);
      const call = onChange.mock.calls[0][0];
      expect(call.start).toBe(expectedStart);
      expect(call.end).toBe(expectedEnd);
    });

    it('accepts a custom zoom factor', async () => {
      const customZoomFactor = 0.42;
      const { onChange } = renderPicker({
        defaultValue: `${start} to ${end}`,
        showTimeWindowButtons: { showZoomIn: true, zoomFactor: customZoomFactor },
      });

      await act(async () => {
        fireEvent.click(screen.getByTestId('dateRangePickerZoomInButton'));
      });

      const windowMs = moment(end).diff(moment(start));
      const zoomDelta = windowMs * (customZoomFactor / 2);
      const expectedStart = moment(start).add(zoomDelta, 'ms').toISOString();
      const expectedEnd = moment(end).subtract(zoomDelta, 'ms').toISOString();

      expect(onChange).toHaveBeenCalledTimes(1);
      const call = onChange.mock.calls[0][0];
      expect(call.start).toBe(expectedStart);
      expect(call.end).toBe(expectedEnd);
    });

    it('does nothing when time window is 0', async () => {
      const sameTime = '2025-01-01T12:00:00.000Z';
      const { onChange } = renderPicker({
        defaultValue: `${sameTime} to ${sameTime}`,
        showTimeWindowButtons: { showZoomIn: true },
      });

      await act(async () => {
        fireEvent.click(screen.getByTestId('dateRangePickerZoomInButton'));
      });

      expect(onChange).not.toHaveBeenCalled();
    });
  });

  describe('zoomFactor', () => {
    it('throws for out-of-range values', () => {
      function renderPickerWithZoomFactor(zoomFactor: number | string) {
        renderPicker({
          defaultValue: '-5m',
          showTimeWindowButtons: { zoomFactor },
        });
      }

      expect(() => renderPickerWithZoomFactor(-0.5)).toThrow();

      expect(() => renderPickerWithZoomFactor(1.1)).toThrow();

      expect(() => renderPickerWithZoomFactor('200%')).toThrow();
    });
  });
});
