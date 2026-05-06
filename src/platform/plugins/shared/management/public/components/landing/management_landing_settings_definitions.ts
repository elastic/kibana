/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import type { IconType } from '@elastic/eui';

/** Ui-settings keys work well as the Advanced Settings search query (locale-agnostic match). */
export interface ManagementLandingSettingsShortcutDefinition {
  readonly id: string;
  readonly title: string;
  readonly icon: IconType;
  readonly capabilityPath: string;
  /**
   * `management` app path (no leading slash). Either `kibana/settings?query=...` or a direct management path.
   */
  readonly managementPath: string;
  readonly sectionBreakBefore?: boolean;
}

const SETTINGS_BASE = 'kibana/settings';

const advancedSettingsPath = (query: string) =>
  `${SETTINGS_BASE}?query=${encodeURIComponent(query)}`;

export const MANAGEMENT_LANDING_SETTINGS_SHORTCUTS: ManagementLandingSettingsShortcutDefinition[] =
  [
    {
      id: 'time_zone',
      title: i18n.translate('management.landing.settingsPanel.row.timeZone', {
        defaultMessage: 'Time zone',
      }),
      icon: 'clock',
      capabilityPath: 'management.kibana.settings',
      managementPath: advancedSettingsPath('dateFormat:tz'),
    },
    {
      id: 'dark_mode',
      title: i18n.translate('management.landing.settingsPanel.row.darkMode', {
        defaultMessage: 'Dark mode',
      }),
      icon: 'invert',
      capabilityPath: 'management.kibana.settings',
      managementPath: advancedSettingsPath('theme:darkMode'),
    },
    {
      id: 'date_format',
      title: i18n.translate('management.landing.settingsPanel.row.dateFormat', {
        defaultMessage: 'Date format',
      }),
      icon: 'document',
      capabilityPath: 'management.kibana.settings',
      managementPath: advancedSettingsPath('dateFormat'),
    },
    {
      id: 'default_route',
      title: i18n.translate('management.landing.settingsPanel.row.defaultRoute', {
        defaultMessage: 'Default route',
      }),
      icon: 'home',
      capabilityPath: 'management.kibana.settings',
      managementPath: advancedSettingsPath('defaultRoute'),
    },
    {
      id: 'day_of_week',
      title: i18n.translate('management.landing.settingsPanel.row.dayOfWeek', {
        defaultMessage: 'Day of week',
      }),
      icon: 'calendar',
      capabilityPath: 'management.kibana.settings',
      managementPath: advancedSettingsPath('dateFormat:dow'),
    },
    {
      id: 'invite_users',
      title: i18n.translate('management.landing.settingsPanel.row.inviteUsers', {
        defaultMessage: 'Invite users / team',
      }),
      icon: 'users',
      capabilityPath: 'management.security.users',
      managementPath: 'security/users/create',
      sectionBreakBefore: true,
    },
  ];
