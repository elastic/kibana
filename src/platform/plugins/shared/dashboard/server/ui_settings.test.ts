/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { UI_SETTINGS } from '../common/constants';
import { getUISettings } from './ui_settings';

describe('getUISettings', () => {
  it('registers the allow-editing-managed-dashboards advanced setting', () => {
    const uiSettings = getUISettings();
    const setting = uiSettings[UI_SETTINGS.ALLOW_EDITING_MANAGED_DASHBOARDS];

    expect(setting).toBeDefined();
    expect(setting.value).toBe(false);
    expect(setting.type).toBe('boolean');
    expect(setting.requiresPageReload).toBe(true);
  });

  it('registers a boolean schema for the allow-editing-managed-dashboards setting', () => {
    const { schema: allowEditingManagedSchema } =
      getUISettings()[UI_SETTINGS.ALLOW_EDITING_MANAGED_DASHBOARDS];

    expect(() => allowEditingManagedSchema.validate(true)).not.toThrow();
    expect(() => allowEditingManagedSchema.validate(false)).not.toThrow();
    expect(() => allowEditingManagedSchema.validate('not-a-boolean')).toThrow();
    expect(() => allowEditingManagedSchema.validate(123)).toThrow();
  });
});
