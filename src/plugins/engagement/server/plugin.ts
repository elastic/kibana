/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { CoreSetup, PluginInitializerContext, Plugin, Logger } from '../../../core/server';

import { EngagementPluginSetup, EngagementPluginStart } from './types';
import type { EngagementConfigType } from './config';
import { registerGetChatTokenRoute } from './getChatTokenRoute';

export class EngagementPlugin implements Plugin<EngagementPluginSetup, EngagementPluginStart> {
  private readonly logger: Logger;

  constructor(private readonly initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
  }

  public setup(core: CoreSetup) {
    this.logger.debug('engagement: Setup');
    const router = core.http.createRouter();
    const config = this.initializerContext.config.get<EngagementConfigType>();

    registerGetChatTokenRoute(router, { chatIdentitySecret: config.chatIdentitySecret });

    return {};
  }

  public start() {
    this.logger.debug('engagement: Started');
    return {};
  }

  public stop() {}
}
