/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { TopNavMenuProps, TopNavMenuExtensionsRegistrySetup } from './top_nav_menu';
import { DataPublicPluginStart } from '../../data/public';

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
