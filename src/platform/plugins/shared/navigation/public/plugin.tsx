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
import type { AppDeepLinkId } from '@kbn/core-chrome-browser';
import { type SolutionId, type NavigationCustomization } from '@kbn/core-chrome-browser';
import type { InternalChromeStart } from '@kbn/core-chrome-browser-internal';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { i18n } from '@kbn/i18n';
import type {
  NavigationPublicSetup,
  NavigationPublicStart,
  NavigationPublicSetupDependencies,
  NavigationPublicStartDependencies,
  AddSolutionNavigationArg,
} from './types';
import { TopNavMenuExtensionsRegistry, createTopNav } from './top_nav_menu';
import type { RegisteredTopNavMenuData } from './top_nav_menu/top_nav_menu_data';

const LazyCustomizeNavigationUserMenuLink = lazy(async () => {
  const { CustomizeNavigationUserMenuLink } = await import(
    '@kbn/navigation-customization-components'
  );
  return { default: CustomizeNavigationUserMenuLink };
});

const CUSTOM_NAV_STORAGE_KEY = 'kibana.solutionNavigationCustomization';
const CALLOUT_DISMISSED_KEY = 'kibana.customizeNavigation.calloutDismissed';

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
  private activeSpaceId = 'default';
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

      this.activeSpaceId = activeSpace?.id ?? 'default';

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

    if (isServerless && !this.getIsUnauthenticated(core.http)) {
      // In serverless, the serverless plugin initializes project navigation directly,
      // bypassing this plugin's addSolutionNavigation flow. Listen for the navigation
      // to become available, then enable customization support.
      chrome.project
        .getNavigation$()
        .pipe(take(1))
        .subscribe(({ solutionId }) => {
          this.activeSolutionId = solutionId;

          const customization = this.loadCustomization();
          if (customization) {
            chrome.project.setNavigationCustomization(customization);
          }

          chrome.project.registerCustomizeNavigationHandler(openCustomizeNavigationModal);

          if (security && this.activeSpaceId) {
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
    const customization = this.loadCustomization();
    this.chrome.project.initNavigation(this.activeSolutionId, def.navigationTree$, {
      customization,
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

      const items = this.getNavigationItems(chrome);

      const savedCustomization = this.loadCustomization();

      const isCalloutDismissed = () => {
        try {
          return localStorage.getItem(CALLOUT_DISMISSED_KEY) === 'true';
        } catch {
          return true;
        }
      };

      const modal = core.overlays.openModal(
        toMountPoint(
          core.rendering.addContext(
            <CustomizeNavigationModal
              items={items}
              isCalloutDismissed={isCalloutDismissed()}
              onChange={(order, hiddenIds) => {
                chrome.project.setNavigationCustomization({
                  order,
                  hiddenIds: hiddenIds as AppDeepLinkId[],
                });
              }}
              onSave={(order, hiddenIds) => {
                const customization = { order, hiddenIds: hiddenIds as AppDeepLinkId[] };
                this.persistCustomization(customization);
                chrome.project.setNavigationCustomization(customization);
                modal.close();
              }}
              onReset={() => {
                this.persistCustomization(undefined);
                chrome.project.setNavigationCustomization(undefined);
                return this.getNavigationItems(chrome);
              }}
              onClose={() => {
                chrome.project.setNavigationCustomization(savedCustomization);
                modal.close();
              }}
              onDismissCallout={() => {
                localStorage.setItem(CALLOUT_DISMISSED_KEY, 'true');
              }}
            />
          ),
          core
        )
      );
    };

    openModal();
  }

  private getNavigationItems(chrome: InternalChromeStart) {
    let tree: any;
    let overflowItemIds: string[] = [];
    chrome.project
      .getNavigation$()
      .subscribe((nav) => {
        tree = nav.navigationTree;
        overflowItemIds = nav.overflowItemIds;
      })
      .unsubscribe();
    if (!tree) return [];
    const overflowSet = new Set(overflowItemIds);
    return tree.body
      .filter((node: any) => node.renderAs !== 'home')
      .map((node: any) => ({
        id: node.id,
        title: node.title || node.id,
        hidden: overflowSet.has(node.id),
        icon: node.icon,
      }));
  }

  private getStorageKey(): string | null {
    if (!this.activeSolutionId) return null;
    return `${this.activeSpaceId}::${this.activeSolutionId}`;
  }

  // TODO: Replace with userStorage
  private loadCustomization(): NavigationCustomization | undefined {
    try {
      const stored = localStorage.getItem(CUSTOM_NAV_STORAGE_KEY);
      if (!stored) return undefined;
      const data = JSON.parse(stored) as Record<string, NavigationCustomization>;
      const key = this.getStorageKey();
      return key ? data[key] : undefined;
    } catch {
      return undefined;
    }
  }

  // TODO: Replace with userStorage
  private persistCustomization(customization: NavigationCustomization | undefined) {
    try {
      const key = this.getStorageKey();
      if (!key) return;

      const raw = localStorage.getItem(CUSTOM_NAV_STORAGE_KEY);
      const data: Record<string, NavigationCustomization> = raw ? JSON.parse(raw) : {};

      if (customization) {
        data[key] = customization;
      } else {
        delete data[key];
      }

      if (Object.keys(data).length === 0) {
        localStorage.removeItem(CUSTOM_NAV_STORAGE_KEY);
      } else {
        localStorage.setItem(CUSTOM_NAV_STORAGE_KEY, JSON.stringify(data));
      }
    } catch {
      // Silently fail
    }
  }
}

function getIsProjectNav(solutionView?: string) {
  return Boolean(solutionView) && isKnownSolutionView(solutionView);
}

function isKnownSolutionView(solution?: string): solution is SolutionId {
  return Boolean(solution) && ['oblt', 'es', 'security'].includes(solution!);
}
