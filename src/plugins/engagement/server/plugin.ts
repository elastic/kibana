/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PluginInitializerContext, Plugin, Logger } from '../../../core/server';

import { EngagementPluginSetup, EngagementPluginStart } from './types';

export class EngagementPlugin implements Plugin<EngagementPluginSetup, EngagementPluginStart> {
  private readonly logger: Logger;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
  }

  public setup() {
    this.logger.debug('engagement: Setup');
    return {};
  }

  public start() {
    this.logger.debug('engagement: Started');
    return {};
  }

  public stop() {}
}
