/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { IUiSettingsClient } from 'src/core/public';
import { UiSettingsCommon } from '../../common/index_patterns';

export class UiSettingsPublicToCommon implements UiSettingsCommon {
  private uiSettings: IUiSettingsClient;
  constructor(uiSettings: IUiSettingsClient) {
    this.uiSettings = uiSettings;
  }
  get(key: string) {
    return Promise.resolve(this.uiSettings.get(key));
  }

  getAll() {
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
