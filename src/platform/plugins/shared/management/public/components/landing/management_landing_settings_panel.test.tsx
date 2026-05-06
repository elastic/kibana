/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { ManagementLandingSettingsPanel } from './management_landing_settings_panel';

const DISMISS_KEY = 'managementLandingSettingsPanelDismissed';
const LEGACY_DISMISS_KEY = 'managementLandingZone3Dismissed';

function buildCaps(settings: boolean, users: boolean) {
  return {
    management: {
      kibana: { settings },
      security: { users },
    },
  } as any;
}

describe('ManagementLandingSettingsPanel', () => {
  const navigateToApp = jest.fn();

  beforeEach(() => {
    navigateToApp.mockClear();
    window.localStorage.removeItem(DISMISS_KEY);
    window.localStorage.removeItem(LEGACY_DISMISS_KEY);
  });

  it('returns null when panel was previously dismissed', () => {
    window.localStorage.setItem(DISMISS_KEY, 'true');

    render(
      <I18nProvider>
        <ManagementLandingSettingsPanel
          capabilities={buildCaps(true, true)}
          navigateToApp={navigateToApp}
        />
      </I18nProvider>
    );

    expect(screen.queryByTestId('managementLandingSettingsPanel')).not.toBeInTheDocument();
  });

  it('honors legacy dismiss storage key', () => {
    window.localStorage.setItem(LEGACY_DISMISS_KEY, 'true');

    render(
      <I18nProvider>
        <ManagementLandingSettingsPanel
          capabilities={buildCaps(true, true)}
          navigateToApp={navigateToApp}
        />
      </I18nProvider>
    );

    expect(screen.queryByTestId('managementLandingSettingsPanel')).not.toBeInTheDocument();
  });

  it('returns null when user has no matching capabilities', () => {
    render(
      <I18nProvider>
        <ManagementLandingSettingsPanel
          capabilities={buildCaps(false, false)}
          navigateToApp={navigateToApp}
        />
      </I18nProvider>
    );

    expect(screen.queryByTestId('managementLandingSettingsPanel')).not.toBeInTheDocument();
  });

  it('shows rows the user can access and navigates to advanced settings with query for time zone', () => {
    render(
      <I18nProvider>
        <ManagementLandingSettingsPanel
          capabilities={buildCaps(true, true)}
          navigateToApp={navigateToApp}
        />
      </I18nProvider>
    );

    expect(screen.getByTestId('managementLandingSettingsPanel')).toBeInTheDocument();
    expect(
      screen.getByTestId('managementLandingSettingsPanelShortcut-time_zone')
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('managementLandingSettingsPanelShortcut-invite_users')
    ).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('managementLandingSettingsPanelShortcut-time_zone'));
    expect(navigateToApp).toHaveBeenCalledWith('management', {
      path: 'kibana/settings?query=dateFormat%3Atz',
    });
  });

  it('navigates invite users to user creation when clicked', () => {
    render(
      <I18nProvider>
        <ManagementLandingSettingsPanel
          capabilities={buildCaps(false, true)}
          navigateToApp={navigateToApp}
        />
      </I18nProvider>
    );

    fireEvent.click(screen.getByTestId('managementLandingSettingsPanelShortcut-invite_users'));
    expect(navigateToApp).toHaveBeenCalledWith('management', {
      path: 'security/users/create',
    });
  });

  it('dismiss hides the panel and persists', () => {
    render(
      <I18nProvider>
        <ManagementLandingSettingsPanel
          capabilities={buildCaps(true, true)}
          navigateToApp={navigateToApp}
        />
      </I18nProvider>
    );

    fireEvent.click(screen.getByTestId('managementLandingSettingsPanelDismiss'));
    expect(screen.queryByTestId('managementLandingSettingsPanel')).not.toBeInTheDocument();
    expect(window.localStorage.getItem(DISMISS_KEY)).toBe('true');
  });
});
