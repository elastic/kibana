/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { CoreSetup, Plugin, PluginInitializerContext, Logger } from '@kbn/core/server';
import { PLUGIN_ID } from '../common';
import { ContentCore } from './core';

export class ContentManagementPlugin implements Plugin {
  private readonly logger: Logger;
  private contentCore: ContentCore;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
    this.contentCore = new ContentCore();
  }

  public setup(core: CoreSetup): void {
    this.logger.info(`>>>> [${PLUGIN_ID}] setup...`);

    // Here we will pass the core http client and other Kibana deps
    this.contentCore.setup();
  }

  public start() {
    this.logger.info(`>>>> [${PLUGIN_ID}] start...`);

    return {
      ...this.contentCore.start(),
    };
  }
}
