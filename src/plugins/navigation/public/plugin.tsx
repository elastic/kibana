/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React from 'react';
import { combineLatest, debounceTime, ReplaySubject, takeUntil } from 'rxjs';
import { PluginInitializerContext, CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import type { UnifiedSearchPublicPluginStart } from '@kbn/unified-search-plugin/public';
import type {
  SolutionNavigationDefinition,
  SolutionNavigationDefinitions,
} from '@kbn/core-chrome-browser';
import { InternalChromeStart } from '@kbn/core-chrome-browser-internal';
import { definition as esDefinition } from '@kbn/solution-nav-es';
import { definition as obltDefinition } from '@kbn/solution-nav-oblt';
import type { PanelContentProvider } from '@kbn/shared-ux-chrome-navigation';
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
import { SideNavComponent } from './side_navigation';

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
  private coreStart?: CoreStart;
  private depsStart?: NavigationPublicStartDependencies;

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
    depsStart: NavigationPublicStartDependencies
  ): NavigationPublicStart {
    this.coreStart = core;
    this.depsStart = depsStart;

    const { unifiedSearch, cloud } = depsStart;
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

    const onCloud = cloud !== undefined; // The new side nav will initially only be available to cloud users
    const isServerless = this.initializerContext.env.packageInfo.buildFlavor === 'serverless';
    const isSolutionNavEnabled = isSolutionNavigationFeatureOn && onCloud && !isServerless;

    if (isSolutionNavEnabled) {
      chrome.project.setCloudUrls(cloud);
      this.addDefaultSolutionNavigation({ chrome });
      this.susbcribeToSolutionNavUiSettings(core);
    }

    return {
      ui: {
        TopNavMenu: createTopNav(unifiedSearch, extensions),
        AggregateQueryTopNavMenu: createTopNav(unifiedSearch, extensions),
        createTopNavWithCustomContext: createCustomTopNav,
      },
      addSolutionNavigation: (
        solutionNavigation: Omit<SolutionNavigation, 'sideNavComponent'> & {
          /** Data test subj for the side navigation */
          dataTestSubj?: string;
          /** Panel content provider for the side navigation */
          panelContentProvider?: PanelContentProvider;
        }
      ) => {
        if (!isSolutionNavEnabled) return;
        return this.addSolutionNavigation(solutionNavigation);
      },
      isSolutionNavigationEnabled: () => isSolutionNavEnabled,
    };
  }

  public stop() {
    this.stop$.next();
  }

  private susbcribeToSolutionNavUiSettings(core: CoreStart) {
    const chrome = core.chrome as InternalChromeStart;

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

  private getSideNavComponent({
    dataTestSubj,
    panelContentProvider,
  }: {
    panelContentProvider?: PanelContentProvider;
    dataTestSubj?: string;
  } = {}): SolutionNavigationDefinition['sideNavComponent'] {
    if (!this.coreStart) throw new Error('coreStart is not available');
    if (!this.depsStart) throw new Error('depsStart is not available');

    const core = this.coreStart;
    const { project } = core.chrome as InternalChromeStart;
    const activeNavigationNodes$ = project.getActiveNavigationNodes$();
    const navigationTreeUi$ = project.getNavigationTreeUi$();

    return () => (
      <SideNavComponent
        navProps={{ navigationTree$: navigationTreeUi$, dataTestSubj, panelContentProvider }}
        deps={{ core, activeNodes$: activeNavigationNodes$ }}
      />
    );
  }

  private addSolutionNavigation(
    solutionNavigation: SolutionNavigation & {
      /** Data test subj for the side navigation */
      dataTestSubj?: string;
      /** Panel content provider for the side navigation */
      panelContentProvider?: PanelContentProvider;
    }
  ) {
    if (!this.coreStart) throw new Error('coreStart is not available');
    const { dataTestSubj, panelContentProvider, ...rest } = solutionNavigation;
    const sideNavComponent =
      solutionNavigation.sideNavComponent ??
      this.getSideNavComponent({ dataTestSubj, panelContentProvider });
    const { project } = this.coreStart.chrome as InternalChromeStart;
    project.updateSolutionNavigations({
      [solutionNavigation.id]: { ...rest, sideNavComponent },
    });
  }

  private addDefaultSolutionNavigation({ chrome }: { chrome: InternalChromeStart }) {
    const solutionNavs: SolutionNavigationDefinitions = {
      es: {
        ...esDefinition,
        sideNavComponent: this.getSideNavComponent({ dataTestSubj: 'svlSearchSideNav' }),
      },
      oblt: {
        ...obltDefinition,
        sideNavComponent: this.getSideNavComponent({ dataTestSubj: 'svlObservabilitySideNav' }),
      },
    };

    chrome.project.updateSolutionNavigations(solutionNavs, true);
  }
}
