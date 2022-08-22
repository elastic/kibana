/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PluginInitializerContext, CoreSetup, CoreStart, Plugin } from '@kbn/core/public';

export interface ShareToPluginStartDeps {
}

export interface Setup {
}

export interface Start {
}

export class ShareToPublicPlugin implements Plugin<Setup, Start> {
  constructor(initializerContext: PluginInitializerContext) {}

  public setup(core: CoreSetup) {
    console.log('share to "setup"');
    return {};
  }

  public start(core: CoreStart, plugins: ShareToPluginStartDeps) {
    console.log('share to "start"');
    return {};
  }

  public stop() {}
}
