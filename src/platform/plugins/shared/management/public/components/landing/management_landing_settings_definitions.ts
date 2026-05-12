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

/** Rows backed by uiSettings — edited inline on the landing page. */
export interface ManagementLandingUiSettingRowDefinition {
  readonly kind: 'uiSetting';
  readonly id: string;
  readonly title: string;
  readonly icon: IconType;
  readonly capabilityPath: string;
  readonly uiSettingKey: string;
  readonly sectionBreakBefore?: boolean;
}

/** Navigational shortcut rows (not uiSettings). */
export interface ManagementLandingNavigateSettingsRowDefinition {
  readonly kind: 'navigate';
  readonly id: string;
  readonly title: string;
  readonly icon: IconType;
  readonly capabilityPath: string;
  readonly managementPath: string;
  readonly sectionBreakBefore?: boolean;
}

export type ManagementLandingSettingsRowDefinition =
  | ManagementLandingUiSettingRowDefinition
  | ManagementLandingNavigateSettingsRowDefinition;

export const MANAGEMENT_LANDING_SETTINGS_ROWS: ManagementLandingSettingsRowDefinition[] = [
  {
    kind: 'uiSetting',
    id: 'time_zone',
    title: i18n.translate('management.landing.settingsPanel.row.timeZone', {
      defaultMessage: 'Time zone',
    }),
    icon: 'clock',
    capabilityPath: 'management.kibana.settings',
    uiSettingKey: 'dateFormat:tz',
  },
  {
    kind: 'uiSetting',
    id: 'dark_mode',
    title: i18n.translate('management.landing.settingsPanel.row.darkMode', {
      defaultMessage: 'Dark mode',
    }),
    icon: 'invert',
    capabilityPath: 'management.kibana.settings',
    uiSettingKey: 'theme:darkMode',
  },
  {
    kind: 'uiSetting',
    id: 'date_format',
    title: i18n.translate('management.landing.settingsPanel.row.dateFormat', {
      defaultMessage: 'Date format',
    }),
    icon: 'calendar',
    capabilityPath: 'management.kibana.settings',
    uiSettingKey: 'dateFormat',
  },
  {
    kind: 'uiSetting',
    id: 'default_route',
    title: i18n.translate('management.landing.settingsPanel.row.defaultRoute', {
      defaultMessage: 'Default route',
    }),
    icon: 'home',
    capabilityPath: 'management.kibana.settings',
    uiSettingKey: 'defaultRoute',
  },
  {
    kind: 'uiSetting',
    id: 'day_of_week',
    title: i18n.translate('management.landing.settingsPanel.row.dayOfWeek', {
      defaultMessage: 'Day of week',
    }),
    icon: 'calendar',
    capabilityPath: 'management.kibana.settings',
    uiSettingKey: 'dateFormat:dow',
  },
];
