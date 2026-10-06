/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ThemeName, UiSettingsParams } from '@kbn/core-ui-settings-common';
export interface GetCoreSettingsOptions {
  isDist: boolean;
  isThemeSwitcherEnabled: boolean | undefined;
  defaultTheme?: ThemeName;
}
export declare const getCoreSettings: (
  options: GetCoreSettingsOptions
) => Record<string, UiSettingsParams>;
export declare const getGlobalCoreSettings: () => Record<string, UiSettingsParams>;
