/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { IUiSettingsClient } from '@kbn/core/server';
import { UiSettingsCommon } from '../common';

export class UiSettingsServerToCommon implements UiSettingsCommon {
  private uiSettings: IUiSettingsClient;
  constructor(uiSettings: IUiSettingsClient) {
    this.uiSettings = uiSettings;
  }
  get<T = unknown>(key: string): Promise<T | undefined> {
    return this.uiSettings.get(key);
  }

  getAll<T = unknown>(): Promise<Record<string, T>> {
    return this.uiSettings.getAll();
  }

  set(key: string, value: unknown) {
    return this.uiSettings.set(key, value);
  }

  remove(key: string) {
    return this.uiSettings.remove(key);
  }
}
