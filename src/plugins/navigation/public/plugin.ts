/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PluginInitializerContext, CoreSetup, CoreStart, Plugin } from 'src/core/public';
import {
  NavigationPublicPluginSetup,
  NavigationPublicPluginStart,
  NavigationPluginStartDependencies,
} from './types';
import { TopNavMenuExtensionsRegistry, createTopNav } from './top_nav_menu';

export class NavigationPublicPlugin
  implements Plugin<NavigationPublicPluginSetup, NavigationPublicPluginStart>
{
  private readonly topNavMenuExtensionsRegistry: TopNavMenuExtensionsRegistry =
    new TopNavMenuExtensionsRegistry();

  constructor(initializerContext: PluginInitializerContext) {}

  public setup(core: CoreSetup): NavigationPublicPluginSetup {
    return {
      registerMenuItem: this.topNavMenuExtensionsRegistry.register.bind(
        this.topNavMenuExtensionsRegistry
      ),
    };
  }

  public start(
    core: CoreStart,
    { unifiedSearch }: NavigationPluginStartDependencies
  ): NavigationPublicPluginStart {
    const extensions = this.topNavMenuExtensionsRegistry.getAll();

    return {
      ui: {
        TopNavMenu: createTopNav(unifiedSearch, extensions),
      },
    };
  }

  public stop() {}
}
