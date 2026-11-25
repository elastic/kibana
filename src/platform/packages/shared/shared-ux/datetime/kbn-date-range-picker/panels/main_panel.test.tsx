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
  });
});
