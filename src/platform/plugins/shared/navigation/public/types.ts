/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AggregateQuery, Query } from '@kbn/es-query';
import type { Observable } from 'rxjs';
import type { UnifiedSearchPublicPluginStart } from '@kbn/unified-search-plugin/public';
import type {
  NavigationTreeDefinition,
  SolutionNavigationDefinition,
  NavExtensionActionEvent,
} from '@kbn/core-chrome-browser';
import type { NavExtensionDefinition, NavExtensionId } from '@kbn/ui-side-navigation';
import type { CloudSetup, CloudStart } from '@kbn/cloud-plugin/public';
import type { SpacesPluginSetup, SpacesPluginStart } from '@kbn/spaces-plugin/public';
import type {
  TopNavMenuProps,
  TopNavMenuExtensionsRegistrySetup,
  createTopNav,
} from './top_nav_menu';
import type { RegisteredTopNavMenuData } from './top_nav_menu/top_nav_menu_data';
import type { SlotDataSourcesFor } from './extension_points';
export interface NavigationPublicSetup {
  /**
   * @deprecated Use AppMenu from "@kbn/core-chrome-app-menu" instead
   */
  registerMenuItem: TopNavMenuExtensionsRegistrySetup['register'];
  /**
   * Publish a navigation extension definition (template id + declarative config).
   * The `Id` must be a key registered in `NavExtensionRegistry` via declaration merging.
   */
  registerNavigationExtension: <Id extends NavExtensionId>(
    definition: NavExtensionDefinition<Id>
  ) => void;
}

export interface SolutionNavigation<T extends NavigationTreeDefinition = NavigationTreeDefinition>
  extends Omit<SolutionNavigationDefinition, 'navigationTree$'> {
  navigationTree$: Observable<NavigationTreeDefinition>;
  /**
   * Observable data sources powering the tree's extension slots, keyed by `slotId`.
   * Typed from the tree so every placed slot must supply a `data$` emitting exactly
   * the row type the referenced extension declared in `NavExtensionRegistry`.
   */
  slotDataSources?: SlotDataSourcesFor<T>;
}

export type AddSolutionNavigationArg<
  T extends NavigationTreeDefinition = NavigationTreeDefinition
> = SolutionNavigation<T>;

export interface NavigationPublicStart {
  ui: {
    /**
     * @deprecated Use AppMenu from "@kbn/core-chrome-app-menu" instead
     */
    TopNavMenu: (props: TopNavMenuProps<Query>) => React.ReactElement;
    /**
     * @deprecated Use AppMenu from "@kbn/core-chrome-app-menu" instead
     */
    AggregateQueryTopNavMenu: (props: TopNavMenuProps<AggregateQuery>) => React.ReactElement;
    /**
     * @deprecated Use AppMenu from "@kbn/core-chrome-app-menu" instead
     */
    createTopNavWithCustomContext: (
      customUnifiedSearch?: UnifiedSearchPublicPluginStart,
      customExtensions?: RegisteredTopNavMenuData[]
    ) => ReturnType<typeof createTopNav>;
  };
  /** Add a solution navigation to the header nav switcher. */
  addSolutionNavigation: <T extends NavigationTreeDefinition = NavigationTreeDefinition>(
    solutionNavigationAgg: AddSolutionNavigationArg<T>
  ) => void;
  /** Flag to indicate if the solution navigation is enabled.*/
  isSolutionNavEnabled$: Observable<boolean>;
  /**
   * Stream of non-link extension slot actions fired by templates. Registering plugins
   * subscribe to handle behavior, using `slotId` to disambiguate placements.
   */
  getExtensionSlotActions$: (slotId: string) => Observable<NavExtensionActionEvent>;
}

export interface NavigationPublicSetupDependencies {
  cloud?: CloudSetup;
  spaces?: SpacesPluginSetup;
}

export interface NavigationPublicStartDependencies {
  unifiedSearch: UnifiedSearchPublicPluginStart;
  cloud?: CloudStart;
  spaces?: SpacesPluginStart;
}

export type SolutionType = 'es' | 'oblt' | 'security' | 'analytics';
