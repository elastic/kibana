/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PluginInitializerContext, CoreSetup, CoreStart, Plugin, Logger } from '@kbn/core/server';
import {
  UnifiedFieldListServerPluginSetup,
  UnifiedFieldListServerPluginStart,
  PluginStart,
  PluginSetup,
} from './types';
import { defineRoutes } from './routes';
import { getUiSettings } from './ui_settings';

export class UnifiedFieldListPlugin
  implements Plugin<UnifiedFieldListServerPluginSetup, UnifiedFieldListServerPluginStart>
{
  private readonly logger: Logger;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
  }

  public setup(core: CoreSetup<PluginStart>, plugins: PluginSetup) {
    this.logger.debug('unifiedFieldList: Setup');
    core.uiSettings.register(getUiSettings());

    defineRoutes(core, this.logger);

    return {};
  }

  public start(core: CoreStart, plugins: PluginStart) {
    this.logger.debug('unifiedFieldList: Started');
    return {};
  }

  public stop() {}
}
