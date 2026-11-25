/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState } from 'react';
import { fireEvent, screen } from '@testing-library/react';
import { renderWithEuiTheme } from '@kbn/test-jest-helpers';

import type { AutoRefreshSettings } from '../types';
import { RefreshInterval } from './refresh_interval';

describe('RefreshInterval', () => {
  it.each<[string, AutoRefreshSettings, Partial<AutoRefreshSettings>]>([
    [
      'starts the timer when turned on',
      { isEnabled: false, isPaused: true, intervalMs: 10_000 },
      { isEnabled: true, isPaused: false },
    ],
    [
      'pauses the timer when turned off',
      { isEnabled: true, isPaused: false, intervalMs: 10_000 },
      { isEnabled: false, isPaused: true },
    ],
  ])('%s', (_, value, expected) => {
    const onChange = jest.fn();
    renderWithEuiTheme(<RefreshInterval value={value} onChange={onChange} />);

    fireEvent.click(screen.getByTestId('dateRangePickerAutoRefreshToggle'));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith({ ...value, ...expected });
  });

  it('updates `intervalMs` when the count field changes', () => {
    const onChange = jest.fn();
    renderWithEuiTheme(
      <RefreshInterval
        value={{ isEnabled: true, isPaused: false, intervalMs: 60_000, intervalDisplayUnit: 'm' }}
        onChange={onChange}
      />
    );

    const count = screen.getByTestId('dateRangePickerAutoRefreshIntervalCount');
    expect(count).toHaveValue(1);

    fireEvent.change(count, { target: { value: '5' } });

    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ intervalMs: 5 * 60_000 }));
  });

  it('updates `intervalMs` and `intervalDisplayUnit` when the unit select changes', () => {
    const onChange = jest.fn();
    renderWithEuiTheme(
      <RefreshInterval
        value={{ isEnabled: true, isPaused: false, intervalMs: 60_000, intervalDisplayUnit: 'm' }}
        onChange={onChange}
      />
    );

    fireEvent.change(screen.getByTestId('dateRangePickerAutoRefreshIntervalUnit'), {
      target: { value: 'h' },
    });

    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ intervalDisplayUnit: 'h', intervalMs: 60 * 60_000 })
    );
  });

  it('re-syncs the count field when intervalMs stays the same but intervalDisplayUnit is updated externally', () => {
    const Harness = () => {
      const [value, setValue] = useState<AutoRefreshSettings>({
        isEnabled: true,
        isPaused: true,
        intervalMs: 60_000,
        intervalDisplayUnit: 'm',
      });

      return (
        <>
          <button
            type="button"
            data-test-subj="externalSameMsSwitchToSeconds"
            onClick={() => setValue((prev) => ({ ...prev, intervalDisplayUnit: 's' }))}
          />
          <RefreshInterval value={value} onChange={setValue} />
        </>
      );
    };

    renderWithEuiTheme(<Harness />);

    expect(screen.getByTestId('dateRangePickerAutoRefreshIntervalCount')).toHaveValue(1);

    fireEvent.click(screen.getByTestId('externalSameMsSwitchToSeconds'));

    expect(screen.getByTestId('dateRangePickerAutoRefreshIntervalCount')).toHaveValue(60);
  });

  it('disables every control when `readOnly`', () => {
    renderWithEuiTheme(
      <RefreshInterval
        value={{ isEnabled: true, isPaused: false, intervalMs: 10_000 }}
        onChange={jest.fn()}
        readOnly
      />
    );

    expect(screen.getByTestId('dateRangePickerAutoRefreshToggle')).toBeDisabled();
    expect(screen.getByTestId('dateRangePickerAutoRefreshIntervalCount')).toBeDisabled();
    expect(screen.getByTestId('dateRangePickerAutoRefreshIntervalUnit')).toBeDisabled();
  });

  describe('with `minIntervalMs`', () => {
    it('does not apply a count below the minimum while typing and raises it on blur', () => {
      const onChange = jest.fn();
      renderWithEuiTheme(
        <RefreshInterval
          value={{ isEnabled: true, isPaused: false, intervalMs: 60_000, intervalDisplayUnit: 's' }}
          onChange={onChange}
          minIntervalMs={5000}
        />
      );

      const count = screen.getByTestId('dateRangePickerAutoRefreshIntervalCount');
      fireEvent.change(count, { target: { value: '2' } });

      expect(onChange).not.toHaveBeenCalled();

      fireEvent.blur(count);

      expect(count).toHaveValue(5);
      expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ intervalMs: 5000 }));
    });

    it('applies the typed count to the unit picked right after it', () => {
      const onChange = jest.fn();
      renderWithEuiTheme(
        <RefreshInterval
          value={{ isEnabled: true, isPaused: false, intervalMs: 60_000, intervalDisplayUnit: 's' }}
          onChange={onChange}
          minIntervalMs={5000}
        />
      );

      const count = screen.getByTestId('dateRangePickerAutoRefreshIntervalCount');
      const unit = screen.getByTestId('dateRangePickerAutoRefreshIntervalUnit');
      fireEvent.change(count, { target: { value: '2' } });
      fireEvent.blur(count, { relatedTarget: unit });

      expect(count).toHaveValue(2);
      expect(onChange).not.toHaveBeenCalled();

      fireEvent.change(unit, { target: { value: 'm' } });

      expect(onChange).toHaveBeenLastCalledWith(
        expect.objectContaining({ intervalDisplayUnit: 'm', intervalMs: 2 * 60_000 })
      );
    });

    it('raises the count to the minimum when switching to a smaller unit', () => {
      const onChange = jest.fn();
      renderWithEuiTheme(
        <RefreshInterval
          value={{ isEnabled: true, isPaused: false, intervalMs: 60_000, intervalDisplayUnit: 'm' }}
          onChange={onChange}
          minIntervalMs={5000}
        />
      );

      fireEvent.change(screen.getByTestId('dateRangePickerAutoRefreshIntervalUnit'), {
        target: { value: 's' },
      });

      expect(onChange).toHaveBeenLastCalledWith(
        expect.objectContaining({ intervalDisplayUnit: 's', intervalMs: 5000 })
      );
    });
  });
});
