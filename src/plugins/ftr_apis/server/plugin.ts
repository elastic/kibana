/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { CoreSetup, Plugin, PluginInitializerContext } from '@kbn/core/server';
import { registerRoutes } from './routes';
import type { ConfigType } from './config';

export class FtrApisPlugin implements Plugin {
  private readonly config: ConfigType;

  constructor(initializerContext: PluginInitializerContext) {
    this.config = initializerContext.config.get<ConfigType>();
  }

  public setup({ http, savedObjects }: CoreSetup) {
    const router = http.createRouter();
    if (!this.config.disableApis) {
      registerRoutes(router);
    }
  }

  public start() {}
}
