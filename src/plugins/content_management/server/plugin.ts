/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { CoreSetup, Plugin, PluginInitializerContext, Logger } from '@kbn/core/server';
import { PLUGIN_ID } from '../common';

export class ContentManagementPlugin implements Plugin {
  private readonly logger: Logger;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
  }

  public setup(core: CoreSetup): void {
    this.logger.info(`>>>> [${PLUGIN_ID}] setup...`);
  }

  public start() {
    this.logger.info(`>>>> [${PLUGIN_ID}] start...`);
  }
}
