/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Observable } from 'rxjs';
import { of, ReplaySubject, take, map, switchMap } from 'rxjs';
import type {
  PluginInitializerContext,
  CoreSetup,
  CoreStart,
  Plugin,
  HttpStart,
} from '@kbn/core/public';
import type { UnifiedSearchPublicPluginStart } from '@kbn/unified-search-plugin/public';
import type { Space } from '@kbn/spaces-plugin/public';
import type { SolutionId } from '@kbn/core-chrome-browser';
import type { InternalChromeStart } from '@kbn/core-chrome-browser-internal';
import type {
  NavigationPublicSetup,
  NavigationPublicStart,
  NavigationPublicSetupDependencies,
  NavigationPublicStartDependencies,
  AddSolutionNavigationArg,
} from './types';
import { TopNavMenuExtensionsRegistry, createTopNav } from './top_nav_menu';
import type { RegisteredTopNavMenuData } from './top_nav_menu/top_nav_menu_data';

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
  private isSolutionNavEnabled = false;
  private isCloudTrialUser = false;

  constructor(private initializerContext: PluginInitializerContext) {}

  public setup(core: CoreSetup, deps: NavigationPublicSetupDependencies): NavigationPublicSetup {
    this.isCloudTrialUser = deps.cloud?.isInTrial() ?? false;

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

    const { unifiedSearch, cloud, spaces } = depsStart;
    const extensions = this.topNavMenuExtensionsRegistry.getAll();
    const chrome = core.chrome as InternalChromeStart;
    const activeSpace$: Observable<Space | undefined> = spaces?.getActiveSpace$() ?? of(undefined);
    const isServerless = this.initializerContext.env.packageInfo.buildFlavor === 'serverless';
    this.isSolutionNavEnabled = spaces?.isSolutionViewEnabled ?? false;

    /**
     * @deprecated Use AppMenu from "@kbn/core-chrome-app-menu" instead
     */
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

    const initSolutionNavigation = (activeSpace?: Space) => {
      this.initiateChromeStyleAndSideNav(chrome, {
        isServerless,
        activeSpace,
      });

      const feedbackUrlParams = this.buildFeedbackUrlParams(
        isServerless,
        cloud?.isCloudEnabled ?? false
      );
      chrome.project.setFeedbackUrlParams(feedbackUrlParams);

      if (!this.isSolutionNavEnabled) return;

      if (cloud) {
        chrome.project.setCloudUrls(cloud.getUrls()); // Ensure the project has the non-privileged URLs immediately
        cloud.getPrivilegedUrls().then((privilegedUrls) => {
          if (Object.keys(privilegedUrls).length === 0) return;

          chrome.project.setCloudUrls({ ...privilegedUrls, ...cloud.getUrls() }); // Merge the privileged URLs once available
        });
      }
    };

    if (this.getIsUnauthenticated(core.http)) {
      // Don't fetch the active space if the user is not authenticated
      initSolutionNavigation();
    } else {
      activeSpace$.pipe(take(1)).subscribe(initSolutionNavigation);
    }

    return {
      ui: {
        /**
         * @deprecated Use AppMenu from "@kbn/core-chrome-app-menu" instead
         */
        TopNavMenu: createTopNav(unifiedSearch, extensions),
        /**
         * @deprecated Use AppMenu from "@kbn/core-chrome-app-menu" instead
         */
        AggregateQueryTopNavMenu: createTopNav(unifiedSearch, extensions),
        /**
         * @deprecated Use AppMenu from "@kbn/core-chrome-app-menu" instead
         */
        createTopNavWithCustomContext: createCustomTopNav,
      },
      addSolutionNavigation: (solutionNavigation) => {
        if (!this.isSolutionNavEnabled) return;
        this.addSolutionNavigation(solutionNavigation);
      },
      isSolutionNavEnabled$: of(this.getIsUnauthenticated(core.http)).pipe(
        switchMap((isUnauthenticated) => {
          if (isUnauthenticated) return of(false);
          return activeSpace$.pipe(
            map((activeSpace) => {
              return this.isSolutionNavEnabled && getIsProjectNav(activeSpace?.solution);
            })
          );
        })
      ),
    };
  }

  public stop() {
    this.stop$.next();
  }

  private addSolutionNavigation(solutionNavigation: AddSolutionNavigationArg) {
    if (!this.coreStart) throw new Error('coreStart is not available');
    const { project } = this.coreStart.chrome as InternalChromeStart;
    project.updateSolutionNavigations({
      [solutionNavigation.id]: solutionNavigation,
    });
  }

  private initiateChromeStyleAndSideNav(
    chrome: InternalChromeStart,
    { isServerless, activeSpace }: { isServerless: boolean; activeSpace?: Space }
  ) {
    const solutionView = activeSpace?.solution;
    const isProjectNav = this.isSolutionNavEnabled && getIsProjectNav(solutionView);

    // On serverless the chrome style is already set by the serverless plugin
    if (!isServerless) {
      chrome.setChromeStyle(isProjectNav ? 'project' : 'classic');

      if (isProjectNav) {
        chrome.sideNav.setIsFeedbackBtnVisible(!this.isCloudTrialUser);
      }
    }

    if (isProjectNav && solutionView !== 'classic') {
      chrome.project.changeActiveSolutionNavigation(solutionView!);
    }
  }

  private getIsUnauthenticated(http: HttpStart) {
    const { anonymousPaths } = http;
    return anonymousPaths.isAnonymous(window.location.pathname);
  }

  private buildFeedbackUrlParams(isServerless: boolean, isCloudEnabled: boolean) {
    const version = this.initializerContext.env.packageInfo.version;
    const type = isServerless ? 'serverless' : isCloudEnabled ? 'ech' : 'local';
    return new URLSearchParams({
      version,
      type,
    });
  }
}

function getIsProjectNav(solutionView?: string) {
  return Boolean(solutionView) && isKnownSolutionView(solutionView);
}

function isKnownSolutionView(solution?: string): solution is SolutionId {
  return Boolean(solution) && ['oblt', 'es', 'security'].includes(solution!);
}
