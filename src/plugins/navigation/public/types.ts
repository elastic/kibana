/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { AggregateQuery, Query } from '@kbn/es-query';
import { UnifiedSearchPublicPluginStart } from '@kbn/unified-search-plugin/public';
import { TopNavMenuProps, TopNavMenuExtensionsRegistrySetup, createTopNav } from './top_nav_menu';
import { RegisteredTopNavMenuData } from './top_nav_menu/top_nav_menu_data';

export interface NavigationPublicSetup {
  registerMenuItem: TopNavMenuExtensionsRegistrySetup['register'];
}

export interface NavigationPublicStart {
  ui: {
    TopNavMenu: (props: TopNavMenuProps<Query>) => React.ReactElement;
    AggregateQueryTopNavMenu: (props: TopNavMenuProps<AggregateQuery>) => React.ReactElement;
    createTopNavWithCustomContext: (
      customUnifiedSearch?: UnifiedSearchPublicPluginStart,
      customExtensions?: RegisteredTopNavMenuData[]
    ) => ReturnType<typeof createTopNav>;
  };
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface NavigationPublicSetupDependencies {}

export interface NavigationPublicStartDependencies {
  unifiedSearch: UnifiedSearchPublicPluginStart;
}
