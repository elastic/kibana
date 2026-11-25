/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { renderWithEuiTheme } from '@kbn/test-jest-helpers';

import { DateRangePicker } from '../date_range_picker';

describe('AutoRefreshPanel', () => {
  it('closes the popover when clicking Done', async () => {
    renderWithEuiTheme(
      <DateRangePicker
        defaultValue="-15m"
        onChange={() => {}}
        settings={{ roundRelativeTime: false }}
        onSettingsChange={() => {}}
        onRefresh={() => {}}
        autoRefresh={{ isEnabled: true, isPaused: false, intervalMs: 10_000 }}
        onAutoRefreshChange={() => {}}
      />
    );

    fireEvent.click(screen.getByTestId('dateRangePickerControlButton'));
    fireEvent.click(
      within(screen.getByTestId('dateRangePickerAutoRefreshNavItem')).getByRole('button')
    );
    expect(await screen.findByTestId('dateRangePickerAutoRefreshPanel')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('dateRangePickerAutoRefreshDoneButton'));

    await waitFor(() => {
      expect(screen.queryByTestId('dateRangePickerAutoRefreshPanel')).not.toBeInTheDocument();
    });
    expect(screen.getByTestId('dateRangePickerControlButton')).toBeInTheDocument();
  });

  it('disables the auto-refresh controls without `onAutoRefreshChange`', async () => {
    renderWithEuiTheme(
      <DateRangePicker
        defaultValue="-15m"
        onChange={() => {}}
        settings={{ roundRelativeTime: false }}
        onSettingsChange={() => {}}
        onRefresh={() => {}}
        autoRefresh={{ isEnabled: true, isPaused: false, intervalMs: 10_000 }}
      />
    );

    fireEvent.click(screen.getByTestId('dateRangePickerControlButton'));
    fireEvent.click(
      within(screen.getByTestId('dateRangePickerAutoRefreshNavItem')).getByRole('button')
    );
    await screen.findByTestId('dateRangePickerAutoRefreshPanel');

    expect(screen.getByTestId('dateRangePickerAutoRefreshToggle')).toBeDisabled();
    expect(screen.getByTestId('dateRangePickerAutoRefreshIntervalCount')).toBeDisabled();
    expect(screen.getByTestId('dateRangePickerAutoRefreshIntervalUnit')).toBeDisabled();
  });
});
