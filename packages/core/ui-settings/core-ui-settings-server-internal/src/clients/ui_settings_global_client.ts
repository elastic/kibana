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
import { BaseUiSettingsClient } from './base_ui_settings_client';

interface UserProvidedValue<T = unknown> {
  userValue?: T;
  isOverridden?: boolean;
}

type UserProvided<T = unknown> = Record<string, UserProvidedValue<T>>;

/**
 * Global UiSettingsClient
 */
export class UiSettingsGlobalClient extends BaseUiSettingsClient {
  private readonly uiSettingsClientCommon;

  constructor(options: UiSettingsServiceOptions) {
    const { log, defaults = {}, overrides = {} } = options;
    super({ overrides, defaults, log });
    this.uiSettingsClientCommon = new UiSettingsClientCommon(options);
  }

  async getUserProvided<T = unknown>(): Promise<UserProvided<T>> {
    return this.uiSettingsClientCommon.getUserProvided();
  }

  async setMany(changes: Record<string, any>) {
    const registeredSettings = super.getRegistered();
    Object.keys(changes).forEach((key) => {
      if (!registeredSettings[key]) {
        throw new SettingNotRegisteredError(key);
      }
    });
    return this.uiSettingsClientCommon.setMany(changes);
  }

  async set(key: string, value: any) {
    const registeredSettings = super.getRegistered();
    if (!registeredSettings[key]) {
      throw new SettingNotRegisteredError(key);
    }
    await this.uiSettingsClientCommon.set(key, value);
  }

  async remove(key: string) {
    await this.uiSettingsClientCommon.remove(key);
  }

  async removeMany(keys: string[]) {
    await this.uiSettingsClientCommon.removeMany(keys);
  }
}
