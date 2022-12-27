/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { UiSettingsClientCommon } from './ui_settings_client_common';
import { UiSettingsServiceOptions } from '../types';
import { SettingNotRegisteredError } from '../ui_settings_errors';

/**
 * Global UiSettingsClient
 */
export class UiSettingsGlobalClient extends UiSettingsClientCommon {
  constructor(options: UiSettingsServiceOptions) {
    super(options);
  }

  async setMany(changes: Record<string, any>) {
    const registeredSettings = super.getRegistered();
    Object.keys(changes).forEach((key) => {
      if (!registeredSettings[key]) {
        throw new SettingNotRegisteredError(key);
      }
    });
    return super.setMany(changes);
  }

  async set(key: string, value: any) {
    const registeredSettings = super.getRegistered();
    if (!registeredSettings[key]) {
      throw new SettingNotRegisteredError(key);
    }
    await super.set(key, value);
  }
}
