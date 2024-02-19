/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { combineLatest, ReplaySubject, takeUntil } from 'rxjs';
import { debounce } from 'lodash';
import { PluginInitializerContext, CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import { UnifiedSearchPublicPluginStart } from '@kbn/unified-search-plugin/public';

import {
  ENABLE_SOLUTION_NAV_UI_SETTING_ID,
  STATUS_SOLUTION_NAV_UI_SETTING_ID,
  DEFAULT_SOLUTION_NAV_UI_SETTING_ID,
} from '../common';
import {
  NavigationPublicSetup,
  NavigationPublicStart,
  NavigationPublicSetupDependencies,
  NavigationPublicStartDependencies,
  ConfigSchema,
} from './types';
import { TopNavMenuExtensionsRegistry, createTopNav } from './top_nav_menu';
import { RegisteredTopNavMenuData } from './top_nav_menu/top_nav_menu_data';

export class NavigationPublicPlugin
  implements
    Plugin<
      NavigationPublicSetup,
      NavigationPublicStart,
      NavigationPublicSetupDependencies,
      NavigationPublicStartDependencies
    >
{
  private readonly topNavMenuExtensionsRegistry: TopNavMenuExtensionsRegistry =
    new TopNavMenuExtensionsRegistry();
  private readonly stop$ = new ReplaySubject<void>(1);

  constructor(private initializerContext: PluginInitializerContext<ConfigSchema>) {}

  public setup(_core: CoreSetup): NavigationPublicSetup {
    return {
      registerMenuItem: this.topNavMenuExtensionsRegistry.register.bind(
        this.topNavMenuExtensionsRegistry
      ),
    };
  }

  public start(
    core: CoreStart,
    { unifiedSearch }: NavigationPublicStartDependencies
  ): NavigationPublicStart {
    const extensions = this.topNavMenuExtensionsRegistry.getAll();

    /*
     *
     *  This helps clients of navigation to create
     *  a TopNav Search Bar which does not uses global unifiedSearch/data/query service
     *
     *  Useful in creating multiple stateful SearchBar in the same app without affecting
     *  global filters
     *
     * */
    const createCustomTopNav = (
      /*
       * Custom instance of unified search if it needs to be overridden
       *
       * */
      customUnifiedSearch?: UnifiedSearchPublicPluginStart,
      customExtensions?: RegisteredTopNavMenuData[]
    ) => {
      return createTopNav(customUnifiedSearch ?? unifiedSearch, customExtensions ?? extensions);
    };

    const config = this.initializerContext.config.get();
    console.log(config);

    combineLatest([
      core.settings.globalClient.get$(ENABLE_SOLUTION_NAV_UI_SETTING_ID),
      core.settings.globalClient.get$(STATUS_SOLUTION_NAV_UI_SETTING_ID),
      core.settings.globalClient.get$(DEFAULT_SOLUTION_NAV_UI_SETTING_ID),
    ])
      .pipe(takeUntil(this.stop$))
      .subscribe(
        debounce(([enabled, status, defaultSolution]) => {
          console.log({ enabled, status, defaultSolution });
        }, 10)
      );

    return {
      ui: {
        TopNavMenu: createTopNav(unifiedSearch, extensions),
        AggregateQueryTopNavMenu: createTopNav(unifiedSearch, extensions),
        createTopNavWithCustomContext: createCustomTopNav,
      },
    };
  }

  public stop() {
    this.stop$.next();
  }
}
