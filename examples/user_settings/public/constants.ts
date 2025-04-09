/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { UserSettingsMeta } from '@kbn/core-user-settings-browser';

export const DEFAULT_TABLE_CONFIGURATION = {
  autoFit: false,
  rowHeight: 20,
  rowDensity: 'default',
};

export const SPACE_AGNOSTIC_SETTING_DEFAULT_VALUE = {
  checkbox_2: true,
} as const;

export const tableConfigurationSetting: UserSettingsMeta = {
  name: 'tableConfiguration',
  isSpaceAware: true,
  defaultValue: DEFAULT_TABLE_CONFIGURATION,
  requiredPageReload: false,
};

export const spaceAgnosticSetting: UserSettingsMeta = {
  name: 'spaceAgnosticSetting',
  isSpaceAware: false,
  defaultValue: SPACE_AGNOSTIC_SETTING_DEFAULT_VALUE,
  requiredPageReload: false,
};
