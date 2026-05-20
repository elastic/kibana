/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { lazy, Suspense } from 'react';
import type { Observable } from 'rxjs';
import { of, ReplaySubject, take, map, switchMap, takeUntil } from 'rxjs';
import type {
  PluginInitializerContext,
  CoreSetup,
  CoreStart,
  Plugin,
  HttpStart,
} from '@kbn/core/public';
import type { UnifiedSearchPublicPluginStart } from '@kbn/unified-search-plugin/public';
import type { Space } from '@kbn/spaces-plugin/public';
import type { AppDeepLinkId } from '@kbn/core-chrome-browser';
import { type SolutionId, type NavigationCustomization } from '@kbn/core-chrome-browser';
import type { InternalChromeStart } from '@kbn/core-chrome-browser-internal';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { i18n } from '@kbn/i18n';
import { computeMoves } from './compute_moves';
import type {
  NavigationPublicSetup,
  NavigationPublicStart,
  NavigationPublicSetupDependencies,
  NavigationPublicStartDependencies,
  AddSolutionNavigationArg,
} from './types';
import { TopNavMenuExtensionsRegistry, createTopNav } from './top_nav_menu';
import type { RegisteredTopNavMenuData } from './top_nav_menu/top_nav_menu_data';
import {
  NAV_CUSTOMIZATION_STORAGE_KEY,
  NAV_CALLOUT_DISMISSED_STORAGE_KEY,
} from '../common/constants';

const LazyCustomizeNavigationUserMenuLink = lazy(async () => {
  const { CustomizeNavigationUserMenuLink } = await import(
    '@kbn/navigation-customization-components'
  );
  return { default: CustomizeNavigationUserMenuLink };
});

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
  private readonly solutionNavDefinitions = new Map<SolutionId, AddSolutionNavigationArg>();
  private chrome?: InternalChromeStart;
  private activeSolutionId: SolutionId | null = null;
  private isSolutionNavEnabled = false;

  constructor(private initializerContext: PluginInitializerContext) {}

  public setup(core: CoreSetup, deps: NavigationPublicSetupDependencies): NavigationPublicSetup {
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
    const { unifiedSearch, cloud, spaces, security } = depsStart;
    const extensions = this.topNavMenuExtensionsRegistry.getAll();
    const chrome = core.chrome as InternalChromeStart;
    this.chrome = chrome;
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

    const openCustomizeNavigationModal = () => {
      this.openCustomizeNavigationModal(core, chrome);
    };

    const initSolutionNavigation = (activeSpace?: Space) => {
      this.initiateChromeStyleAndSideNav(chrome, {
        isServerless,
        activeSpace,
      });

      if (!this.isSolutionNavEnabled) return;

      if (cloud) {
        chrome.project.setCloudUrls(cloud.getUrls()); // Ensure the project has the non-privileged URLs immediately
        cloud.getPrivilegedUrls().then((privilegedUrls) => {
          if (Object.keys(privilegedUrls).length === 0) return;

          chrome.project.setCloudUrls({ ...privilegedUrls, ...cloud.getUrls() }); // Merge the privileged URLs once available
        });
      }

      if (security && !isServerless && getIsProjectNav(activeSpace?.solution)) {
        security.navControlService.addUserMenuLinks([
          {
            iconType: 'controls',
            label: i18n.translate('navigation.userMenuLinkLabel', {
              defaultMessage: 'Customize navigation',
            }),
            href: '',
            order: 500,
            content: ({ closePopover }) => {
              return (
                <Suspense fallback={null}>
                  <LazyCustomizeNavigationUserMenuLink
                    closePopover={closePopover}
                    onClick={openCustomizeNavigationModal}
                  />
                </Suspense>
              );
            },
          },
        ]);
      }
    };

    if (this.getIsUnauthenticated(core.http)) {
      // Don't fetch the active space if the user is not authenticated
      initSolutionNavigation();
    } else {
      activeSpace$.pipe(take(1)).subscribe(initSolutionNavigation);
    }

    if (this.isSolutionNavEnabled) {
      chrome.project.registerCustomizeNavigationHandler(openCustomizeNavigationModal);
    }

    // Reactively apply stored customization to the navigation. The initial emission
    // is synchronous from the server-injected cache, so navigation is seeded before
    // the first render. Subsequent emissions handle multi-tab sync.
    if (!this.getIsUnauthenticated(core.http)) {
      core.userStorage
        .get$<NavigationCustomization>(NAV_CUSTOMIZATION_STORAGE_KEY)
        .pipe(takeUntil(this.stop$))
        .subscribe((customization) => {
          chrome.project.setNavigationCustomization(customization);
        });
    }

    if (isServerless && !this.getIsUnauthenticated(core.http)) {
      // In serverless, the serverless plugin initializes project navigation directly,
      // bypassing this plugin's addSolutionNavigation flow. Listen for the navigation
      // to become available, then enable customization support.
      chrome.project
        .getNavigation$()
        .pipe(take(1))
        .subscribe(({ solutionId }) => {
          this.activeSolutionId = solutionId;

          chrome.project.registerCustomizeNavigationHandler(openCustomizeNavigationModal);

          if (security) {
            security.navControlService.addUserMenuLinks([
              {
                iconType: 'controls',
                label: i18n.translate('navigation.serverless.userMenuLinkLabel', {
                  defaultMessage: 'Customize navigation',
                }),
                href: '',
                order: 500,
                content: ({ closePopover }) => {
                  return (
                    <Suspense fallback={null}>
                      <LazyCustomizeNavigationUserMenuLink
                        closePopover={closePopover}
                        onClick={openCustomizeNavigationModal}
                      />
                    </Suspense>
                  );
                },
              },
            ]);
          }
        });
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

  private addSolutionNavigation(def: AddSolutionNavigationArg) {
    this.solutionNavDefinitions.set(def.id, def);
    this.tryInitNavigation();
  }

  private tryInitNavigation() {
    if (!this.activeSolutionId || !this.chrome) return;
    const def = this.solutionNavDefinitions.get(this.activeSolutionId);
    if (!def) return;
    this.chrome.project.initNavigation(this.activeSolutionId, def.navigationTree$);
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
    }

    if (isProjectNav && solutionView !== 'classic') {
      this.activeSolutionId = solutionView as SolutionId;
      this.tryInitNavigation();
    }
  }

  private getIsUnauthenticated(http: HttpStart) {
    const { anonymousPaths } = http;
    return anonymousPaths.isAnonymous(window.location.pathname);
  }

  private openCustomizeNavigationModal(core: CoreStart, chrome: InternalChromeStart) {
    const openModal = async () => {
      const { CustomizeNavigationModal } = await import('@kbn/navigation-customization-components');

      const { items, defaultItemIds } = this.getNavigationItems(chrome);

      const savedCustomization = core.userStorage.get<NavigationCustomization>(
        NAV_CUSTOMIZATION_STORAGE_KEY
      );
      const isCalloutDismissed = core.userStorage.get<boolean>(
        NAV_CALLOUT_DISMISSED_STORAGE_KEY,
        false
      );

      const toCustomization = (order: string[], hiddenIds: string[]): NavigationCustomization => ({
        moves: computeMoves(defaultItemIds, order),
        hidden: hiddenIds as AppDeepLinkId[],
      });

      const modal = core.overlays.openModal(
        toMountPoint(
          core.rendering.addContext(
            <CustomizeNavigationModal
              items={items}
              isCalloutDismissed={isCalloutDismissed}
              onChange={(order, hiddenIds) => {
                chrome.project.setNavigationCustomization(toCustomization(order, hiddenIds));
              }}
              onSave={(order, hiddenIds) => {
                core.userStorage.set(
                  NAV_CUSTOMIZATION_STORAGE_KEY,
                  toCustomization(order, hiddenIds)
                );
                modal.close();
              }}
              onReset={() => {
                chrome.project.setNavigationCustomization(undefined);
                core.userStorage.remove(NAV_CUSTOMIZATION_STORAGE_KEY);
                return this.getNavigationItems(chrome).items;
              }}
              onClose={() => {
                chrome.project.setNavigationCustomization(savedCustomization);
                modal.close();
              }}
              onDismissCallout={() => {
                core.userStorage.set(NAV_CALLOUT_DISMISSED_STORAGE_KEY, true);
              }}
            />
          ),
          core
        )
      );
    };

    openModal();
  }

  private getNavigationItems(chrome: InternalChromeStart): {
    items: Array<{ id: string; title: string; hidden: boolean; icon?: string }>;
    defaultItemIds: string[];
  } {
    let tree: any;
    let overflowItemIds: string[] = [];
    let defaultItemIds: string[] = [];

    chrome.project
      .getNavigation$()
      .subscribe((nav) => {
        tree = nav.navigationTree;
        overflowItemIds = nav.overflowItemIds;
        defaultItemIds = nav.defaultItemIds;
      })
      .unsubscribe();

    if (!tree) return { items: [], defaultItemIds };

    const overflowSet = new Set(overflowItemIds);
    const items = (tree.body as any[])
      .filter((node) => node.renderAs !== 'home')
      .map((node) => ({
        id: node.id as string,
        title: (node.title || node.id) as string,
        hidden: overflowSet.has(node.id),
        icon: node.icon as string | undefined,
      }));

    return { items, defaultItemIds };
  }
}

function getIsProjectNav(solutionView?: string) {
  return Boolean(solutionView) && isKnownSolutionView(solutionView);
}

function isKnownSolutionView(solution?: string): solution is SolutionId {
  return Boolean(solution) && ['oblt', 'es', 'security'].includes(solution!);
}
