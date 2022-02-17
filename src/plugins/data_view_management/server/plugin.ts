/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PluginInitializerContext, CoreSetup, Plugin } from 'src/core/server';

import { registerPreviewScriptedFieldRoute, registerResolveIndexRoute } from './routes';

export class IndexPatternManagementPlugin implements Plugin<void, void> {
  constructor(initializerContext: PluginInitializerContext) {}

  public setup(core: CoreSetup) {
    const router = core.http.createRouter();

    registerPreviewScriptedFieldRoute(router);
    registerResolveIndexRoute(router);
  }

  public start() {}

  public stop() {}
}
