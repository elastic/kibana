/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Plugin, CoreSetup, PluginInitializerContext } from 'kibana/server';
import { registerRoutes } from './routes';

/** @deprecated */
export class LegacyExportPlugin implements Plugin<{}, {}> {
  constructor(private readonly initContext: PluginInitializerContext) {}

  public setup({ http }: CoreSetup) {
    const globalConfig = this.initContext.config.legacy.get();

    const router = http.createRouter();
    registerRoutes(
      router,
      this.initContext.env.packageInfo.version,
      globalConfig.savedObjects.maxImportPayloadBytes.getValueInBytes()
    );

    return {};
  }

  public start() {
    return {};
  }

  public stop() {}
}
