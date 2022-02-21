/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  PluginInitializerContext,
  CoreSetup,
  CoreStart,
  Plugin,
  Logger,
} from '../../../core/server';

import { SharedUXPluginSetup, SharedUXPluginStart } from './types';

export class SharedUXPlugin implements Plugin<SharedUXPluginSetup, SharedUXPluginStart> {
  private readonly logger: Logger;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
  }

  public setup(_core: CoreSetup) {
    this.logger.debug('sharedUX: Setup');
    return {};
  }

  public start(_core: CoreStart) {
    this.logger.debug('sharedUX: Started');
    return {};
  }

  public stop() {}
}
