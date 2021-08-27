/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { CoreSetup, CoreStart } from '../../../core/public';
import type { Plugin } from '../../../core/public/plugins/plugin';
import type { PluginInitializerContext } from '../../../core/public/plugins/plugin_context';
import { createTopNav } from './top_nav_menu/create_top_nav_menu';
import { TopNavMenuExtensionsRegistry } from './top_nav_menu/top_nav_menu_extensions_registry';
import type {
  NavigationPluginStartDependencies,
  NavigationPublicPluginSetup,
  NavigationPublicPluginStart,
} from './types';

export class NavigationPublicPlugin
  implements Plugin<NavigationPublicPluginSetup, NavigationPublicPluginStart> {
  private readonly topNavMenuExtensionsRegistry: TopNavMenuExtensionsRegistry = new TopNavMenuExtensionsRegistry();

  constructor(initializerContext: PluginInitializerContext) {}

  public setup(core: CoreSetup): NavigationPublicPluginSetup {
    return {
      registerMenuItem: this.topNavMenuExtensionsRegistry.register.bind(
        this.topNavMenuExtensionsRegistry
      ),
    };
  }

  public start(
    { i18n }: CoreStart,
    { data }: NavigationPluginStartDependencies
  ): NavigationPublicPluginStart {
    const extensions = this.topNavMenuExtensionsRegistry.getAll();

    return {
      ui: {
        TopNavMenu: createTopNav(data, extensions, i18n),
      },
    };
  }

  public stop() {}
}
