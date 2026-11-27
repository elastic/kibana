/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { screen } from '@testing-library/react';
import { renderWithEuiTheme } from '@kbn/test-jest-helpers';

import type { DateRangePickerProps } from '../date_range_picker';
import type { AutoRefreshSettings } from '../types';
import { DateRangePickerProvider } from '../date_range_picker_context';
import { DateRangePickerPanelNavigationProvider } from '../date_range_picker_panel_navigation';
import { MainPanel } from './main_panel';

const renderMainPanel = (props: Partial<DateRangePickerProps> = {}) =>
  renderWithEuiTheme(
    <DateRangePickerProvider
      defaultValue="-15m"
      onChange={() => {}}
      settings={{ roundRelativeTime: false }}
      onSettingsChange={() => {}}
      {...props}
    >
      <DateRangePickerPanelNavigationProvider defaultPanelId="main" panelDescriptors={[]}>
        <MainPanel />
      </DateRangePickerPanelNavigationProvider>
    </DateRangePickerProvider>
  );

describe('MainPanel', () => {
  describe('auto-refresh', () => {
    const autoRefresh = { isEnabled: false, isPaused: true, intervalMs: 10_000 };

    it('shows the auto-refresh nav item when `onRefresh` and `autoRefresh` are set', () => {
      renderMainPanel({ onRefresh: () => {}, autoRefresh });

      expect(screen.getByTestId('dateRangePickerAutoRefreshNavItem')).toBeInTheDocument();
    });

    it.each<[string, Partial<DateRangePickerProps>]>([
      ['`autoRefresh` is absent', { onRefresh: () => {} }],
      ['`onRefresh` is absent', { autoRefresh }],
    ])('hides the auto-refresh nav item when %s', (_, props) => {
      renderMainPanel(props);

      expect(screen.queryByTestId('dateRangePickerAutoRefreshNavItem')).not.toBeInTheDocument();
    });

    it.each<[string, AutoRefreshSettings]>([
      ['Disabled', { isEnabled: false, isPaused: true, intervalMs: 10_000 }],
      ['Every 10 sec', { isEnabled: true, isPaused: false, intervalMs: 10_000 }],
      ['Every 10 sec', { isEnabled: true, isPaused: true, intervalMs: 10_000 }],
      ['Every 5 min', { isEnabled: true, isPaused: false, intervalMs: 300_000 }],
      ['Every 2 hr', { isEnabled: true, isPaused: false, intervalMs: 7_200_000 }],
      [
        'Every 120 sec',
        { isEnabled: true, isPaused: false, intervalMs: 120_000, intervalDisplayUnit: 's' },
      ],
      [
        'Every 10 sec',
        { isEnabled: true, isPaused: false, intervalMs: 10_000, intervalDisplayUnit: 'm' },
      ],
      [
        'Every 1.5 min',
        { isEnabled: true, isPaused: false, intervalMs: 90_000, intervalDisplayUnit: 'm' },
      ],
    ])('shows "%s" in the auto-refresh badge', (label, value) => {
      renderMainPanel({ onRefresh: () => {}, autoRefresh: value });

      expect(screen.getByTestId('dateRangePickerAutoRefreshBadge')).toHaveTextContent(label);
    });
  });
});
