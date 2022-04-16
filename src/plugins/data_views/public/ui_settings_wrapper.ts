/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { IUiSettingsClient, PublicUiSettingsParams, UserProvidedValues } from '@kbn/core/public';
import { UiSettingsCommon } from '../common';

export class UiSettingsPublicToCommon implements UiSettingsCommon {
  private uiSettings: IUiSettingsClient;
  constructor(uiSettings: IUiSettingsClient) {
    this.uiSettings = uiSettings;
  }
  get<T = any>(key: string): Promise<T> {
    return Promise.resolve(this.uiSettings.get(key));
  }

  getAll<T = any>(): Promise<Record<string, PublicUiSettingsParams & UserProvidedValues<T>>> {
    return Promise.resolve(this.uiSettings.getAll());
  }

  set(key: string, value: any) {
    this.uiSettings.set(key, value);
    return Promise.resolve();
  }

  remove(key: string) {
    this.uiSettings.remove(key);
    return Promise.resolve();
  }
}
