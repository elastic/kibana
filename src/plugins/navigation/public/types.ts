/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { DataPublicPluginStart } from '../../data/public/types';
import type { TopNavMenuProps } from './top_nav_menu/top_nav_menu';
import type { TopNavMenuExtensionsRegistrySetup } from './top_nav_menu/top_nav_menu_extensions_registry';

export interface NavigationPublicPluginSetup {
  registerMenuItem: TopNavMenuExtensionsRegistrySetup['register'];
}

export interface NavigationPublicPluginStart {
  ui: {
    TopNavMenu: React.ComponentType<TopNavMenuProps>;
  };
}

export interface NavigationPluginStartDependencies {
  data: DataPublicPluginStart;
}
