/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { Subject } from 'rxjs';
import { I18nProvider } from '@kbn/i18n-react';
import type { IUiSettingsClient } from '@kbn/core-ui-settings-browser';
import { ManagementLandingSettingsPanel } from './management_landing_settings_panel';

function buildCaps(settings: boolean) {
  return {
    management: {
      kibana: { settings },
    },
  } as any;
}

function createUiSettingsMock(): jest.Mocked<IUiSettingsClient> {
  const updates = new Subject<{ key: string; newValue: unknown; oldValue: unknown }>();
  const values: Record<string, unknown> = {
    'dateFormat:tz': 'Browser',
    'theme:darkMode': 'disabled',
    dateFormat: 'MMM D, YYYY',
    defaultRoute: '/app/home',
    'dateFormat:dow': 'Monday',
  };

  const meta: Record<string, Record<string, unknown>> = {
    'dateFormat:tz': { options: ['Browser', 'UTC'], requiresPageReload: true },
    'theme:darkMode': {
      options: ['enabled', 'disabled', 'system'],
      optionLabels: {
        enabled: 'Enabled',
        disabled: 'Disabled',
        system: 'Sync with system',
      },
      requiresPageReload: true,
    },
    dateFormat: {},
    defaultRoute: {},
    'dateFormat:dow': { options: ['Monday', 'Tuesday'], requiresPageReload: false },
  };

  return {
    get: jest.fn((key: string) => values[key]),
    get$: jest.fn(),
    getAll: jest.fn(() => meta as any),
    set: jest.fn(async (key: string, value: unknown) => {
      const oldValue = values[key];
      values[key] = value;
      updates.next({ key, newValue: value, oldValue });
      return true;
    }),
    remove: jest.fn(),
    isDeclared: jest.fn(() => true),
    isDefault: jest.fn(),
    isCustom: jest.fn(),
    isOverridden: jest.fn(),
    isStrictReadonly: jest.fn(),
    getUpdate$: jest.fn(() => updates.asObservable()),
    getUpdateErrors$: jest.fn(() => new Subject().asObservable()),
    validateValue: jest.fn(async () => ({ successfulValidation: true, valid: true })),
  } as unknown as jest.Mocked<IUiSettingsClient>;
}

describe('ManagementLandingSettingsPanel', () => {
  const navigateToApp = jest.fn();
  let uiSettings: jest.Mocked<IUiSettingsClient>;

  beforeEach(() => {
    navigateToApp.mockClear();
    uiSettings = createUiSettingsMock();
    window.localStorage.removeItem('managementLandingSettingsPanelDismissed');
    window.localStorage.removeItem('managementLandingZone3Dismissed');
  });

  afterEach(() => {
    cleanup();
  });

  it('shows panel even if legacy localStorage dismiss flags are set (dismiss is not persisted)', () => {
    window.localStorage.setItem('managementLandingSettingsPanelDismissed', 'true');
    window.localStorage.setItem('managementLandingZone3Dismissed', 'true');

    render(
      <I18nProvider>
        <ManagementLandingSettingsPanel
          capabilities={buildCaps(true)}
          navigateToApp={navigateToApp}
          uiSettings={uiSettings}
        />
      </I18nProvider>
    );

    expect(screen.getByTestId('managementLandingSettingsPanel')).toBeInTheDocument();
  });

  it('returns null when user has no matching capabilities', () => {
    render(
      <I18nProvider>
        <ManagementLandingSettingsPanel
          capabilities={buildCaps(false)}
          navigateToApp={navigateToApp}
          uiSettings={uiSettings}
        />
      </I18nProvider>
    );

    expect(screen.queryByTestId('managementLandingSettingsPanel')).not.toBeInTheDocument();
  });

  it('announces validation errors for inline ui settings', async () => {
    uiSettings.validateValue.mockResolvedValueOnce({
      successfulValidation: true,
      valid: false,
      errorMessage: 'Not a valid value',
    });

    render(
      <I18nProvider>
        <ManagementLandingSettingsPanel
          capabilities={buildCaps(true)}
          navigateToApp={navigateToApp}
          uiSettings={uiSettings}
        />
      </I18nProvider>
    );

    fireEvent.click(screen.getByTestId('managementLandingSettingsRowEdit-dark_mode'));
    const darkModeControl = screen.getByTestId('managementLandingSettingsUiRow-dark_mode');
    fireEvent.change(darkModeControl.querySelector('select')!, {
      target: { value: 'enabled' },
    });

    fireEvent.click(screen.getByTestId('managementLandingSettingsRowSave-dark_mode'));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Not a valid value');
    });
  });

  it('shows ui setting rows and validates before saving dark mode', async () => {
    render(
      <I18nProvider>
        <ManagementLandingSettingsPanel
          capabilities={buildCaps(true)}
          navigateToApp={navigateToApp}
          uiSettings={uiSettings}
        />
      </I18nProvider>
    );

    expect(screen.getByTestId('managementLandingSettingsPanel')).toBeInTheDocument();
    expect(screen.getByTestId('managementLandingSettingsUiRow-time_zone')).toBeInTheDocument();
    expect(screen.getByTestId('managementLandingSettingsUiRow-day_of_week')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('managementLandingSettingsRowEdit-dark_mode'));
    const darkModeControl = screen.getByTestId('managementLandingSettingsUiRow-dark_mode');
    fireEvent.change(darkModeControl.querySelector('select')!, {
      target: { value: 'enabled' },
    });

    fireEvent.click(screen.getByTestId('managementLandingSettingsRowSave-dark_mode'));

    await waitFor(() => {
      expect(uiSettings.validateValue).toHaveBeenCalledWith('theme:darkMode', 'enabled');
      expect(uiSettings.set).toHaveBeenCalledWith('theme:darkMode', 'enabled');
    });
  });

  it('dismiss hides the panel without writing localStorage', () => {
    render(
      <I18nProvider>
        <ManagementLandingSettingsPanel
          capabilities={buildCaps(true)}
          navigateToApp={navigateToApp}
          uiSettings={uiSettings}
        />
      </I18nProvider>
    );

    fireEvent.click(screen.getByTestId('managementLandingSettingsPanelDismiss'));
    expect(screen.queryByTestId('managementLandingSettingsPanel')).not.toBeInTheDocument();
    expect(window.localStorage.getItem('managementLandingSettingsPanelDismissed')).not.toBe('true');
  });
});
