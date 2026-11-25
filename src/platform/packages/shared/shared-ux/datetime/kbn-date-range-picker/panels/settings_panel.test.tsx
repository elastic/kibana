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

import { DateRangePickerProvider } from '../date_range_picker_context';
import { DateRangePickerPanelNavigationProvider } from '../date_range_picker_panel_navigation';
import { SettingsPanel } from './settings_panel';

const renderSettingsPanel = (timeZone?: string) =>
  renderWithEuiTheme(
    <DateRangePickerProvider
      defaultValue="-15m"
      onChange={() => {}}
      settings={{ roundRelativeTime: false }}
      onSettingsChange={() => {}}
      timeZone={timeZone}
    >
      <DateRangePickerPanelNavigationProvider
        defaultPanelId={SettingsPanel.PANEL_ID}
        panelDescriptors={[]}
      >
        <SettingsPanel />
      </DateRangePickerPanelNavigationProvider>
    </DateRangePickerProvider>
  );

describe('SettingsPanel', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('time zone description', () => {
    it('names the configured time zone', () => {
      renderSettingsPanel('Europe/Amsterdam');

      expect(
        screen.getByText(/Time zone is set to Europe\/Amsterdam \(GMT[+-]\d{2}:\d{2}\)/)
      ).toBeInTheDocument();
    });

    it("names the browser's time zone when timeZone is omitted", () => {
      jest
        .spyOn(Intl.DateTimeFormat.prototype, 'resolvedOptions')
        .mockReturnValue({ timeZone: 'Etc/GMT+5' } as Intl.ResolvedDateTimeFormatOptions);
      renderSettingsPanel();

      expect(
        screen.getByText("Time zone is unset. Your browser's default is Etc/GMT+5 (GMT-05:00).")
      ).toBeInTheDocument();
      expect(screen.queryByText(/undefined|null/)).not.toBeInTheDocument();
    });

    it('falls back to a generic message when the browser time zone cannot be resolved', () => {
      jest
        .spyOn(Intl.DateTimeFormat.prototype, 'resolvedOptions')
        .mockReturnValue({ timeZone: '' } as Intl.ResolvedDateTimeFormatOptions);
      renderSettingsPanel();

      expect(
        screen.getByText("Time zone is unset. Your browser's default is used.")
      ).toBeInTheDocument();
    });
  });
});
