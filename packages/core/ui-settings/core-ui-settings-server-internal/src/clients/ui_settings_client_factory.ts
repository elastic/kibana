/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { UiSettingsServiceOptions } from '../..';
import { UiSettingsClient } from './ui_settings_client';
import { UiSettingsGlobalClient } from './ui_settings_global_client';

export class UiSettingsClientFactory {
  public static create = (options: UiSettingsServiceOptions) => {
    switch (options.type) {
      case 'config':
        return new UiSettingsClient(options);
      case 'config-global':
        return new UiSettingsGlobalClient(options);
      default:
        throw new Error('Unsupported client error');
    }
  };
}
