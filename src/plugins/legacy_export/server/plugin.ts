/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { Plugin, CoreSetup, PluginInitializerContext } from 'kibana/server';
import { first } from 'rxjs/operators';
import { registerRoutes } from './routes';

export class LegacyExportPlugin implements Plugin<{}, {}> {
  constructor(private readonly initContext: PluginInitializerContext) {}

  public async setup({ http }: CoreSetup) {
    const globalConfig = await this.initContext.config.legacy.globalConfig$
      .pipe(first())
      .toPromise();

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
