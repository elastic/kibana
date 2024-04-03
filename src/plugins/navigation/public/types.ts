/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { AggregateQuery, Query } from '@kbn/es-query';
import type { Observable } from 'rxjs';
import type { UnifiedSearchPublicPluginStart } from '@kbn/unified-search-plugin/public';
import type { SolutionNavigationDefinition } from '@kbn/core-chrome-browser';
import type { CloudSetup, CloudStart } from '@kbn/cloud-plugin/public';
import type { SecurityPluginSetup, SecurityPluginStart } from '@kbn/security-plugin/public';

import { PanelContentProvider } from '@kbn/shared-ux-chrome-navigation';
import { TopNavMenuProps, TopNavMenuExtensionsRegistrySetup, createTopNav } from './top_nav_menu';
import type { RegisteredTopNavMenuData } from './top_nav_menu/top_nav_menu_data';

export interface NavigationPublicSetup {
  registerMenuItem: TopNavMenuExtensionsRegistrySetup['register'];
}

export type SolutionNavigation = Omit<SolutionNavigationDefinition, 'sideNavComponentGetter'>;
export type AddSolutionNavigationArg = Omit<SolutionNavigation, 'sideNavComponent'> & {
  /** Data test subj for the side navigation */
  dataTestSubj?: string;
  /** Panel content provider for the side navigation */
  panelContentProvider?: PanelContentProvider;
};

export interface NavigationPublicStart {
  ui: {
    TopNavMenu: (props: TopNavMenuProps<Query>) => React.ReactElement;
    AggregateQueryTopNavMenu: (props: TopNavMenuProps<AggregateQuery>) => React.ReactElement;
    createTopNavWithCustomContext: (
      customUnifiedSearch?: UnifiedSearchPublicPluginStart,
      customExtensions?: RegisteredTopNavMenuData[]
    ) => ReturnType<typeof createTopNav>;
  };
  /** Add a solution navigation to the header nav switcher. */
  addSolutionNavigation: (solutionNavigationAgg: AddSolutionNavigationArg) => void;
  /** Flag to indicate if the solution navigation is enabled.*/
  isSolutionNavEnabled$: Observable<boolean>;
}

export interface NavigationPublicSetupDependencies {
  cloud?: CloudSetup;
  security?: SecurityPluginSetup;
}

export interface NavigationPublicStartDependencies {
  unifiedSearch: UnifiedSearchPublicPluginStart;
  cloud?: CloudStart;
  security?: SecurityPluginStart;
}

export type SolutionNavigationOptInStatus = 'visible' | 'hidden' | 'ask';

export type SolutionType = 'es' | 'oblt' | 'security';

export interface ConfigSchema {
  solutionNavigation: {
    featureOn: boolean;
    enabled: boolean;
    optInStatus: SolutionNavigationOptInStatus;
    defaultSolution: SolutionType | 'ask';
  };
}
