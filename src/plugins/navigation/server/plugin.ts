/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type {
  CoreSetup,
  CoreStart,
  Plugin,
  PluginInitializerContext,
  Logger,
} from '@kbn/core/server';

import type {
  NavigationServerSetup,
  NavigationServerSetupDependencies,
  NavigationServerStart,
  NavigationServerStartDependencies,
} from './types';
import { getUiSettings } from './ui_settings';

export class NavigationServerPlugin
  implements
    Plugin<
      NavigationServerSetup,
      NavigationServerStart,
      NavigationServerSetupDependencies,
      NavigationServerStartDependencies
    >
{
  private readonly logger: Logger;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
  }

  setup(
    core: CoreSetup<NavigationServerStartDependencies>,
    plugins: NavigationServerSetupDependencies
  ) {
    core.uiSettings.register(getUiSettings(core, this.logger));

    return {};
  }

  start(core: CoreStart, plugins: NavigationServerStartDependencies) {
    return {};
  }
}
