/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { defaultsDeep } from 'lodash';
import { UiSettingsClientCommon, UiSettingsClientParams } from './ui_settings_client_common';

export class UiSettingsGlobalClient extends UiSettingsClientCommon {
  constructor(params: UiSettingsClientParams) {
    super(params);
  }

  async update(key: string, newVal: any): Promise<boolean> {
    this.assertUpdateAllowed(key);

    const declared = this.isDeclared(key);
    const defaults = this.defaults;

    const oldVal = declared ? this.cache[key].userValue : undefined;

    const unchanged = oldVal === newVal;
    if (unchanged) {
      return true;
    }

    const initialVal = declared ? this.get(key) : undefined;
    this.setLocally(key, newVal);

    try {
      const { settings } = await this.api.batchSetGlobal(key, newVal);
      this.cache = defaultsDeep({}, defaults, settings);
      return true;
    } catch (error) {
      this.setLocally(key, initialVal);
      this.updateErrors$.next(error);
      return false;
    }
  }
}
