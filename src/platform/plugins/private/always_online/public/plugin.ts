/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Plugin, PluginInitializerContext } from '@kbn/core/public';

export interface AlwaysOnlinePluginConfig {
  enabled: boolean;
}

export class AlwaysOnlinePlugin implements Plugin {
  constructor(private initializerContext: PluginInitializerContext<AlwaysOnlinePluginConfig>) {}

  public setup() {
    const enabled = this.initializerContext.config.get();
    if (enabled) {
      Object.defineProperty(window.navigator, 'onLine', {
        get: () => true,
      });
    }
  }
  public start() {}
}
