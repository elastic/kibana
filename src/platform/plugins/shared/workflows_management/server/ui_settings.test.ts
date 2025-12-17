/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { UiSettingsServiceSetup } from '@kbn/core-ui-settings-server';
import { WORKFLOWS_UI_SETTING_ID } from '@kbn/workflows';
import { registerUISettings } from './ui_settings';

describe('Workflows Management UI Settings', () => {
  let mockUiSettings: jest.Mocked<UiSettingsServiceSetup>;

  beforeEach(() => {
    mockUiSettings = {
      register: jest.fn(),
      registerGlobal: jest.fn(),
      setAllowlist: jest.fn(),
    };
  });

  it('should register the workflows UI setting', () => {
    registerUISettings({ uiSettings: mockUiSettings });

    expect(mockUiSettings.register).toHaveBeenCalledWith({
      [WORKFLOWS_UI_SETTING_ID]: {
        description: expect.any(String),
        name: expect.any(String),
        schema: expect.any(Object),
        value: false,
        readonly: false,
        technicalPreview: true,
        requiresPageReload: true,
        category: expect.any(Array),
      },
    });
  });

  it('should register UI settings only once', () => {
    registerUISettings({ uiSettings: mockUiSettings });

    expect(mockUiSettings.register).toHaveBeenCalledTimes(1);
  });
});
