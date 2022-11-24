/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Scope } from '@kbn/core-ui-settings-common';
import type { UiSettingsServiceOptions } from '@kbn/core-ui-settings-server-internal';
import { UiSettingsClient, UiSettingsGlobalClient } from '@kbn/core-ui-settings-server-internal';

export class UiSettingsClientFactory {
  public static create = (options: UiSettingsServiceOptions, scope: Scope) => {
    switch (scope) {
      case 'namespace':
        return new UiSettingsClient(options);
      case 'global':
        return new UiSettingsGlobalClient(options);
      default:
        throw new Error('Unsupported client scope');
    }
  };
}
