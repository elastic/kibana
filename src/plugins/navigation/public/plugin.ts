/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { combineLatest, debounceTime, of, ReplaySubject, takeUntil } from 'rxjs';
import { PluginInitializerContext, CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import type { UnifiedSearchPublicPluginStart } from '@kbn/unified-search-plugin/public';
import type {
  CloudURLs,
  NavigationTreeDefinition,
  SolutionNavigationDefinition,
  SolutionNavigationDefinitions,
} from '@kbn/core-chrome-browser';
import { InternalChromeStart } from '@kbn/core-chrome-browser-internal';
import {
  ENABLE_SOLUTION_NAV_UI_SETTING_ID,
  OPT_IN_STATUS_SOLUTION_NAV_UI_SETTING_ID,
  DEFAULT_SOLUTION_NAV_UI_SETTING_ID,
} from '../common';
import {
  NavigationPublicSetup,
  NavigationPublicStart,
  NavigationPublicSetupDependencies,
  NavigationPublicStartDependencies,
  ConfigSchema,
  SolutionNavigation,
} from './types';
import { TopNavMenuExtensionsRegistry, createTopNav } from './top_nav_menu';
import { RegisteredTopNavMenuData } from './top_nav_menu/top_nav_menu_data';
import { getSideNavComponent } from './side_navigation';

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
    { unifiedSearch, cloud }: NavigationPublicStartDependencies
  ): NavigationPublicStart {
    const extensions = this.topNavMenuExtensionsRegistry.getAll();
    const chrome = core.chrome as InternalChromeStart;

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
    const {
      solutionNavigation: { featureOn: isSolutionNavigationFeatureOn },
    } = config;

    if (isSolutionNavigationFeatureOn) {
      this.addDefaultSolutionNavigation({ core, chrome, cloud });

      combineLatest([
        core.settings.globalClient.get$(ENABLE_SOLUTION_NAV_UI_SETTING_ID),
        core.settings.globalClient.get$(OPT_IN_STATUS_SOLUTION_NAV_UI_SETTING_ID),
        core.settings.globalClient.get$(DEFAULT_SOLUTION_NAV_UI_SETTING_ID),
      ])
        .pipe(takeUntil(this.stop$), debounceTime(10))
        .subscribe(([enabled, status, defaultSolution]) => {
          if (!enabled) {
            chrome.project.changeActiveSolutionNavigation(null);
          } else {
            // TODO: Here we will need to check if the user has opt-in or not.... (value set in their user profile)
            const changeImmediately = status === 'visible';
            chrome.project.changeActiveSolutionNavigation(
              changeImmediately ? defaultSolution : null,
              { onlyIfNotSet: true }
            );
          }
        });
    }

    return {
      ui: {
        TopNavMenu: createTopNav(unifiedSearch, extensions),
        AggregateQueryTopNavMenu: createTopNav(unifiedSearch, extensions),
        createTopNavWithCustomContext: createCustomTopNav,
      },
      addSolutionNavigation: this.addSolutionNavigation.bind(this),
    };
  }

  public stop() {
    this.stop$.next();
  }

  private addSolutionNavigation(solutionNavigation: SolutionNavigation) {
    // TODO: Implement. This handler will allow any plugin (e.g. security) to register a solution navigation.
  }

  private addDefaultSolutionNavigation({
    core,
    chrome,
    cloud = {},
  }: {
    core: CoreStart;
    chrome: InternalChromeStart;
    cloud?: CloudURLs;
  }) {
    const { project } = chrome;
    const activeNavigationNodes$ = project.getActiveNavigationNodes$();
    const navigationTreeUi$ = project.getNavigationTreeUi$();

    const getSideNavComponentGetter: (
      navTree: NavigationTreeDefinition,
      id: string
    ) => SolutionNavigationDefinition['sideNavComponentGetter'] = (navTree, id) => () => {
      project.initNavigation(of(navTree), { cloudUrls: cloud });

      return getSideNavComponent({
        navProps: { navigationTree$: navigationTreeUi$ },
        deps: { core, activeNodes$: activeNavigationNodes$ },
      });
    };

    const solutionNavs: SolutionNavigationDefinitions = {
      es: {
        id: 'es',
        title: 'Search',
        icon: 'logoElasticsearch',
        homePage: 'discover', // Temp. Wil be updated when all links are registered
        sideNavComponentGetter: getSideNavComponentGetter(
          {
            body: [
              // Temp. In future work this will be loaded from a package
              {
                type: 'navGroup',
                id: 'search_project_nav',
                title: 'Search',
                icon: 'logoElasticsearch',
                defaultIsCollapsed: false,
                isCollapsible: false,
                breadcrumbStatus: 'hidden',
                children: [],
              },
            ],
          },
          'search'
        ),
      },
      oblt: {
        id: 'oblt',
        title: 'Observability',
        icon: 'logoObservability',
        homePage: 'discover', // Temp. Wil be updated when all links are registered
        sideNavComponentGetter: getSideNavComponentGetter(
          {
            body: [
              // Temp. In future work this will be loaded from a package
              {
                type: 'navGroup',
                id: 'observability_project_nav',
                title: 'Observability',
                icon: 'logoObservability',
                defaultIsCollapsed: false,
                isCollapsible: false,
                breadcrumbStatus: 'hidden',
                children: [],
              },
            ],
          },
          'oblt'
        ),
      },
      security: {
        id: 'security',
        title: 'Security',
        icon: 'logoSecurity',
        homePage: 'discover', // Temp. Wil be updated when all links are registered
        sideNavComponentGetter: getSideNavComponentGetter(
          {
            body: [
              // Temp. In future work this will be loaded from a package
              {
                type: 'navGroup',
                id: 'security_project_nav',
                title: 'Security',
                icon: 'logoSecurity',
                breadcrumbStatus: 'hidden',
                defaultIsCollapsed: false,
                children: [],
              },
            ],
          },
          'security'
        ),
      },
    };

    chrome.project.updateSolutionNavigations(solutionNavs, true);
  }
}
