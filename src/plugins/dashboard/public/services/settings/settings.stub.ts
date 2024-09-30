/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { themeServiceMock } from '@kbn/core-theme-browser-mocks';
import { uiSettingsServiceMock } from '@kbn/core-ui-settings-browser-mocks';
import { PluginServiceFactory } from '@kbn/presentation-util-plugin/public';
import { i18nServiceMock } from '@kbn/core-i18n-browser-mocks';
import { DashboardSettingsService } from './types';

type SettingsServiceFactory = PluginServiceFactory<DashboardSettingsService>;

export const settingsServiceFactory: SettingsServiceFactory = () => {
  return {
    i18n: i18nServiceMock.createStartContract(),
    uiSettings: uiSettingsServiceMock.createStartContract(),
    theme: themeServiceMock.createStartContract(),
    isProjectEnabledInLabs: jest.fn().mockReturnValue(true),
  };
};
