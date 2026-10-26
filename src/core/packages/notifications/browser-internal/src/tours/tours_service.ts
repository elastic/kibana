/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SettingsStart } from '@kbn/core-ui-settings-browser';
import type { ToursStart } from '@kbn/core-notifications-browser';

interface StartDeps {
  settings: SettingsStart;
}

export class ToursService {
  private settings?: SettingsStart;

  public start({ settings }: StartDeps): ToursStart {
    this.settings = settings;

    return {
      isEnabled: () => {
        const isEnabledGlobally = !this.settings?.globalClient.get<boolean>(
          'hideAnnouncements',
          false
        );
        const isEnabledInNamespace = !this.settings?.client.get<boolean>(
          'hideAnnouncements',
          false
        );
        return isEnabledGlobally && isEnabledInNamespace;
      },
    };
  }
}
