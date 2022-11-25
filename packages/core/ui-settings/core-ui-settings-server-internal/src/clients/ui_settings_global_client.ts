/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { IUiSettingsClient } from '@kbn/core-ui-settings-server';
import { UserProvidedValues } from '@kbn/core-ui-settings-common';
import { UiSettingsClientCommon } from './ui_settings_client_common';
import { UiSettingsServiceOptions } from '../types';
import { SettingNotRegisteredError } from './not_registered_error';
/**
 * Global UiSettingsClient
 */
export class UiSettingsGlobalClient implements IUiSettingsClient {
  private readonly uiSettingsClientCommon;

  constructor(options: UiSettingsServiceOptions) {
    this.uiSettingsClientCommon = new UiSettingsClientCommon(options);
  }

  getRegistered() {
    return this.uiSettingsClientCommon.getRegistered();
  }

  async get(key: string) {
    return this.uiSettingsClientCommon.get(key);
  }

  async getAll() {
    return this.uiSettingsClientCommon.getAll();
  }

  async getUserProvided<T>(): Promise<Record<string, UserProvidedValues<T>>> {
    return this.uiSettingsClientCommon.getUserProvided();
  }

  isOverridden(key: string) {
    return this.uiSettingsClientCommon.isOverridden(key);
  }

  isSensitive(key: string) {
    return this.uiSettingsClientCommon.isSensitive(key);
  }

  async setMany(changes: Record<string, any>) {
    const registeredSettings = this.uiSettingsClientCommon.getRegistered();
    Object.keys(changes).forEach((key) => {
      if (!registeredSettings[key]) {
        throw new SettingNotRegisteredError(key);
      }
    });
    return this.uiSettingsClientCommon.setMany(changes);
  }

  async set(key: string, value: any) {
    const registeredSettings = this.uiSettingsClientCommon.getRegistered();
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
