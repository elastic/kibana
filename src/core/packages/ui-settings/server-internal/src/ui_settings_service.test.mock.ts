/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { vi } from 'vitest';

export const MockUiSettingsClientConstructor = vi.fn();
vi.doMock('./clients/ui_settings_client', () => ({
  UiSettingsClient: MockUiSettingsClientConstructor,
}));

export const MockUiSettingsGlobalClientConstructor = vi.fn();
vi.doMock('./clients/ui_settings_global_client', () => ({
  UiSettingsGlobalClient: MockUiSettingsGlobalClientConstructor,
}));

export const MockUiSettingsDefaultsClientConstructor = vi.fn();
vi.doMock('./clients/ui_settings_defaults_client', () => ({
  UiSettingsDefaultsClient: MockUiSettingsDefaultsClientConstructor,
}));

export const getCoreSettingsMock = vi.fn();
export const getCoreGlobalSettingsMock = vi.fn();
vi.doMock('./settings', () => ({
  getCoreSettings: getCoreSettingsMock,
  getGlobalCoreSettings: getCoreGlobalSettingsMock,
}));
