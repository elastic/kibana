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
import type { DateRangePickerSettings } from '../types';

const providerDefaults = {
  defaultValue: 'last 15 minutes',
  onChange: () => {},
} as const;

const renderWithProvider = (
  settings: DateRangePickerSettings,
  onSettingsChange: (s: DateRangePickerSettings) => void,
  onRefresh?: () => void
) => {
  const providerProps: DateRangePickerProps = {
    ...providerDefaults,
    settings,
    onSettingsChange,
    ...(onRefresh ? { onRefresh } : {}),
  };

  return renderWithKibanaRenderContext(
    <DateRangePickerProvider {...providerProps}>
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
};

describe('Auto-refresh settings row', () => {
  it('omits auto-refresh controls when `settings.autoRefresh` is absent', () => {
    renderWithProvider({ roundRelativeTime: true }, () => {});

    expect(screen.queryByTestId('dateRangePickerAutoRefreshToggle')).not.toBeInTheDocument();
  });

  it('omits auto-refresh controls when `onRefresh` is absent even if `settings.autoRefresh` is set', () => {
    renderWithProvider(
      {
        roundRelativeTime: true,
        autoRefresh: { isEnabled: true, isPaused: false, interval: 10_000 },
      },
      () => {}
    );

    expect(screen.queryByTestId('dateRangePickerAutoRefreshToggle')).not.toBeInTheDocument();
  });

  it('toggles `isEnabled` via the switch and calls `onSettingsChange`', () => {
    const onSettingsChange = jest.fn();
    const onRefresh = jest.fn();

    renderWithProvider(
      {
        roundRelativeTime: true,
        autoRefresh: { isEnabled: false, isPaused: true, interval: 10_000 },
      },
      onSettingsChange,
      onRefresh
    );

    fireEvent.click(screen.getByTestId('dateRangePickerAutoRefreshToggle'));

    expect(onSettingsChange).toHaveBeenCalledTimes(1);

    const next = onSettingsChange.mock.calls[0][0];

    expect(next.autoRefresh).toEqual(
      expect.objectContaining({ isEnabled: true, isPaused: true, interval: 10_000 })
    );
  });

  it('updates interval when the count field changes', () => {
    const onSettingsChange = jest.fn();
    const onRefresh = jest.fn();

    renderWithProvider(
      {
        roundRelativeTime: true,
        autoRefresh: {
          isEnabled: true,
          isPaused: false,
          interval: 60_000,
          intervalUnit: 'm',
        },
      },
      onSettingsChange,
      onRefresh
    );

    const count = screen.getByTestId('dateRangePickerAutoRefreshIntervalCount');

    expect(count).toHaveValue(1);

    fireEvent.change(count, { target: { value: '5' } });

    expect(onSettingsChange).toHaveBeenCalled();

    const last = onSettingsChange.mock.calls.at(-1)[0];

    expect(last.autoRefresh?.interval).toBe(5 * 60_000);
  });

  it('updates `interval` and `intervalUnit` when the unit select changes', () => {
    const onSettingsChange = jest.fn();
    const onRefresh = jest.fn();

    renderWithProvider(
      {
        roundRelativeTime: true,
        autoRefresh: {
          isEnabled: true,
          isPaused: false,
          interval: 60_000,
          intervalUnit: 'm',
        },
      },
      onSettingsChange,
      onRefresh
    );

    fireEvent.change(screen.getByTestId('dateRangePickerAutoRefreshIntervalUnit'), {
      target: { value: 'h' },
    });

    expect(onSettingsChange).toHaveBeenCalled();

    const last = onSettingsChange.mock.calls.at(-1)[0];

    expect(last.autoRefresh).toEqual(
      expect.objectContaining({
        intervalUnit: 'h',
        interval: 60 * 60_000,
      })
    );
  });

  it('re-syncs the count field when interval stays the same but intervalUnit is updated externally', () => {
    const Harness = () => {
      const [settings, setSettings] = useState<DateRangePickerSettings>({
        roundRelativeTime: true,
        autoRefresh: {
          isEnabled: true,
          isPaused: true,
          interval: 60_000,
          intervalUnit: 'm',
        },
      });
      const harnessProviderProps: DateRangePickerProps = {
        ...providerDefaults,
        onRefresh: () => {},
        settings,
        onSettingsChange: setSettings,
      };

      return (
        <>
          <button
            type="button"
            data-test-subj="externalSameMsSwitchToSeconds"
            onClick={() =>
              setSettings((s) => {
                if (!s.autoRefresh) return s;
                return {
                  ...s,
                  autoRefresh: { ...s.autoRefresh, interval: 60_000, intervalUnit: 's' },
                };
              })
            }
          />
          <DateRangePickerProvider {...harnessProviderProps}>
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
