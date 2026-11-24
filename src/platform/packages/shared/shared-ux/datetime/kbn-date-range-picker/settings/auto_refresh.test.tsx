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
import { renderWithKibanaRenderContext } from '@kbn/test-jest-helpers';

import type { DateRangePickerProps } from '../date_range_picker';
import { DateRangePickerProvider } from '../date_range_picker_context';
import {
  DateRangePickerPanel,
  DateRangePickerPanelNavigationProvider,
} from '../date_range_picker_panel_navigation';
import { SettingsPanel } from '../panels/settings_panel';
import type { AutoRefreshSettings } from '../types';

const providerDefaults = {
  defaultValue: 'last 15 minutes',
  onChange: () => {},
  settings: { roundRelativeTime: true },
  onSettingsChange: () => {},
} as const;

const renderSettingsPanel = (props: Partial<DateRangePickerProps> = {}) =>
  renderWithKibanaRenderContext(
    <DateRangePickerProvider {...providerDefaults} {...props}>
      <DateRangePickerPanelNavigationProvider
        defaultPanelId={SettingsPanel.PANEL_ID}
        panelDescriptors={[]}
      >
        <DateRangePickerPanel id={SettingsPanel.PANEL_ID}>
          <SettingsPanel />
        </DateRangePickerPanel>
      </DateRangePickerPanelNavigationProvider>
    </DateRangePickerProvider>
  );

describe('Auto-refresh settings row', () => {
  it('omits auto-refresh controls when `autoRefresh` is absent', () => {
    renderSettingsPanel({ onRefresh: () => {} });

    expect(screen.queryByTestId('dateRangePickerAutoRefreshToggle')).not.toBeInTheDocument();
  });

  it('omits auto-refresh controls when `onRefresh` is absent even if `autoRefresh` is set', () => {
    renderSettingsPanel({
      autoRefresh: { isEnabled: true, isPaused: false, intervalMs: 10_000 },
    });

    expect(screen.queryByTestId('dateRangePickerAutoRefreshToggle')).not.toBeInTheDocument();
  });

  it('starts the timer when the switch turns auto-refresh on', () => {
    const onAutoRefreshChange = jest.fn();

    renderSettingsPanel({
      onRefresh: () => {},
      autoRefresh: { isEnabled: false, isPaused: true, intervalMs: 10_000 },
      onAutoRefreshChange,
    });

    fireEvent.click(screen.getByTestId('dateRangePickerAutoRefreshToggle'));

    expect(onAutoRefreshChange).toHaveBeenCalledTimes(1);
    expect(onAutoRefreshChange).toHaveBeenCalledWith({
      isEnabled: true,
      isPaused: false,
      intervalMs: 10_000,
    });
  });

  it('updates interval when the count field changes', () => {
    const onAutoRefreshChange = jest.fn();

    renderSettingsPanel({
      onRefresh: () => {},
      autoRefresh: {
        isEnabled: true,
        isPaused: false,
        intervalMs: 60_000,
        intervalDisplayUnit: 'm',
      },
      onAutoRefreshChange,
    });

    const count = screen.getByTestId('dateRangePickerAutoRefreshIntervalCount');

    expect(count).toHaveValue(1);

    fireEvent.change(count, { target: { value: '5' } });

    expect(onAutoRefreshChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ intervalMs: 5 * 60_000 })
    );
  });

  it('updates `intervalMs` and `intervalDisplayUnit` when the unit select changes', () => {
    const onAutoRefreshChange = jest.fn();

    renderSettingsPanel({
      onRefresh: () => {},
      autoRefresh: {
        isEnabled: true,
        isPaused: false,
        intervalMs: 60_000,
        intervalDisplayUnit: 'm',
      },
      onAutoRefreshChange,
    });

    fireEvent.change(screen.getByTestId('dateRangePickerAutoRefreshIntervalUnit'), {
      target: { value: 'h' },
    });

    expect(onAutoRefreshChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ intervalDisplayUnit: 'h', intervalMs: 60 * 60_000 })
    );
  });

  it('re-syncs the count field when intervalMs stays the same but intervalDisplayUnit is updated externally', () => {
    const Harness = () => {
      const [autoRefresh, setAutoRefresh] = useState<AutoRefreshSettings>({
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
            onClick={() =>
              setAutoRefresh((prev) => ({ ...prev, intervalMs: 60_000, intervalDisplayUnit: 's' }))
            }
          />
          <DateRangePickerProvider
            {...providerDefaults}
            onRefresh={() => {}}
            autoRefresh={autoRefresh}
            onAutoRefreshChange={setAutoRefresh}
          >
            <DateRangePickerPanelNavigationProvider
              defaultPanelId={SettingsPanel.PANEL_ID}
              panelDescriptors={[]}
            >
              <DateRangePickerPanel id={SettingsPanel.PANEL_ID}>
                <SettingsPanel />
              </DateRangePickerPanel>
            </DateRangePickerPanelNavigationProvider>
          </DateRangePickerProvider>
        </>
      );
    };

    renderWithKibanaRenderContext(<Harness />);

    expect(screen.getByTestId('dateRangePickerAutoRefreshIntervalCount')).toHaveValue(1);

    fireEvent.click(screen.getByTestId('externalSameMsSwitchToSeconds'));

    expect(screen.getByTestId('dateRangePickerAutoRefreshIntervalCount')).toHaveValue(60);
  });
});
