/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Observable } from 'rxjs';
import {
  Subscription,
  ReplaySubject,
  combineLatest,
  distinctUntilChanged,
  map,
  shareReplay,
  takeUntil,
} from 'rxjs';
import type { ChromeNavControls, ChromeNavLinks } from '@kbn/core-chrome-browser';
import type {
  WorkspaceHeaderService,
  WorkspaceNavigationService,
  WorkspaceKnownSidebarApp,
} from '@kbn/core-chrome-browser';
import { WORKSPACE_KNOWN_SIDEBAR_APPS } from '@kbn/core-chrome-browser';
import React from 'react';
import { Provider, type ProviderProps } from 'react-redux';
import type { FeatureFlagsStart } from '@kbn/core-feature-flags-browser';
import type { HttpStart } from '@kbn/core-http-browser';
import type { CustomBranding } from '@kbn/core-custom-branding-common';
import {
  setIsLoading,
  setHomeHref,
  createStore,
  setCurrentAppId,
  type WorkspaceStore,
  setIsChromeVisible,
  setHasHeaderBanner,
  setHasAppMenu,
  setLogo,
  setActiveItemId,
} from '@kbn/core-workspace-chrome-state';
import type { ApplicationStart } from '@kbn/core-application-browser';
import type { RecentlyAccessed } from '@kbn/recently-accessed';
import type {
  WorkspaceServiceStart,
  WorkspaceServiceState,
  WorkspaceSidebarApp,
  WorkspaceSidebarService,
} from '@kbn/core-chrome-browser';
import { toNavigationItems } from '../ui/project/sidenav_v2/navigation/to_navigation_items';
import type { ProjectNavigationService } from '../project_navigation';
import { PanelStateManager } from '../ui/project/sidenav_v2/navigation/panel_state_manager';

const isKnownApp = (appId: string): appId is WorkspaceKnownSidebarApp => {
  return WORKSPACE_KNOWN_SIDEBAR_APPS.includes(appId as WorkspaceKnownSidebarApp);
};

const sortSidebarApps = (apps: ReadonlySet<WorkspaceSidebarApp>) => {
  return Array.from(apps.values()).sort((a, b) => {
    if (isKnownApp(a.appId) && isKnownApp(b.appId)) {
      return (
        WORKSPACE_KNOWN_SIDEBAR_APPS.indexOf(b.appId) -
        WORKSPACE_KNOWN_SIDEBAR_APPS.indexOf(a.appId)
      );
    }

    if (isKnownApp(a.appId)) {
      return -1;
    }

    if (isKnownApp(b.appId)) {
      return 1;
    }

    return a.appId.localeCompare(b.appId);
  });
};

export interface WorkspaceServiceStartDeps {
  featureFlags: FeatureFlagsStart;
  application: Pick<ApplicationStart, 'navigateToUrl' | 'currentAppId$'>;
  http: {
    basePath: Pick<HttpStart['basePath'], 'prepend' | 'get'>;
    getLoadingCount$: HttpStart['getLoadingCount$'];
  };
  customBranding: {
    customBranding$: Observable<Pick<CustomBranding, 'logo'>>;
  };
  // This is dumb.
  projectNavigation: ReturnType<ProjectNavigationService['start']>;
  isVisible$: Observable<boolean>;
  hasHeaderBanner$: Observable<boolean>;
  hasAppMenu$: Observable<boolean>;
  recentlyAccessed: RecentlyAccessed;
  navLinks: ChromeNavLinks;
  navControls: ChromeNavControls;
}

/** @internal */
export class WorkspaceService {
  private readonly stop$ = new ReplaySubject<void>(1);
  private serviceState!: WorkspaceServiceState;
  private storeSubscriptions: Subscription;
  private serviceSubscriptions: Subscription;
  private store: WorkspaceStore = createStore();
  private readonly serviceListeners = new Set<() => void>();

  constructor() {
    this.storeSubscriptions = new Subscription();
    this.serviceSubscriptions = new Subscription();
    this.serviceState = {
      header: {
        breadcrumbs: [],
        navControls: {
          left: [],
          right: [],
          middle: [],
        },
      },
      sidebar: {
        apps: [],
      },
      navigation: {
        items: { primaryItems: [], footerItems: [] },
      },
    };
  }

  private resetSubscriptions() {
    this.storeSubscriptions.unsubscribe();
    this.serviceSubscriptions.unsubscribe();
    this.storeSubscriptions = new Subscription();
    this.serviceSubscriptions = new Subscription();
  }

  public start({
    application,
    featureFlags,
    http,
    projectNavigation,
    navLinks,
    navControls,
    isVisible$,
    hasHeaderBanner$,
    hasAppMenu$,
  }: WorkspaceServiceStartDeps): WorkspaceServiceStart {
    this.resetSubscriptions();
    this.store = createStore();

    this.storeSubscriptions.add(
      http
        .getLoadingCount$()
        .pipe(
          map((v) => v > 0),
          distinctUntilChanged(),
          takeUntil(this.stop$)
        )
        .subscribe((isLoading) => {
          this.store.dispatch(setIsLoading(isLoading));
        })
    );

    this.storeSubscriptions.add(
      projectNavigation
        .getProjectHome$()
        .pipe(takeUntil(this.stop$))
        .subscribe((href) => {
          this.store.dispatch(setHomeHref(href || '/app/home'));
        })
    );

    this.storeSubscriptions.add(
      application.currentAppId$.pipe(takeUntil(this.stop$)).subscribe((appId) => {
        this.store.dispatch(setCurrentAppId(appId));
      })
    );

    this.storeSubscriptions.add(
      isVisible$.pipe(takeUntil(this.stop$)).subscribe((isChromeVisible) => {
        this.store.dispatch(setIsChromeVisible(isChromeVisible));
      })
    );

    this.storeSubscriptions.add(
      hasHeaderBanner$.pipe(takeUntil(this.stop$)).subscribe((hasHeaderBanner) => {
        this.store.dispatch(setHasHeaderBanner(hasHeaderBanner));
      })
    );

    this.storeSubscriptions.add(
      hasAppMenu$.pipe(takeUntil(this.stop$)).subscribe((hasAppMenu) => {
        this.store.dispatch(setHasAppMenu(hasAppMenu));
      })
    );

    const panelStateManager = new PanelStateManager(http.basePath.get());

    const navigationState$ = combineLatest([
      projectNavigation.getNavigationTreeUi$().pipe(takeUntil(this.stop$)),
      navLinks.getNavLinks$().pipe(takeUntil(this.stop$)),
      projectNavigation.getActiveNodes$().pipe(takeUntil(this.stop$)),
    ]).pipe(
      map(([navigationTreeUi, links, nodes]) => {
        return toNavigationItems(navigationTreeUi, links, nodes, panelStateManager);
      }),
      shareReplay({ bufferSize: 1, refCount: true })
    );

    const breadcrumbs$ = projectNavigation.getProjectBreadcrumbs$().pipe(takeUntil(this.stop$));

    const rightNavControls$ = navControls.getRight$().pipe(takeUntil(this.stop$));

    this.serviceSubscriptions.add(
      breadcrumbs$.subscribe((breadcrumbs) => {
        this.serviceState = {
          ...this.serviceState,
          header: {
            ...this.serviceState.header,
            breadcrumbs,
          },
        };
        this.notifyServiceListeners();
      })
    );

    this.serviceSubscriptions.add(
      navControls.getLeft$().subscribe((left) => {
        this.serviceState = {
          ...this.serviceState,
          header: {
            ...this.serviceState.header,
            navControls: { ...this.serviceState.header.navControls, left },
          },
        };
      })
    );

    this.serviceSubscriptions.add(
      navControls.getCenter$().subscribe((middle) => {
        this.serviceState = {
          ...this.serviceState,
          header: {
            ...this.serviceState.header,
            navControls: { ...this.serviceState.header.navControls, middle },
          },
        };
      })
    );

    this.serviceSubscriptions.add(
      navigationState$.subscribe((state) => {
        this.serviceState = {
          ...this.serviceState,
          navigation: {
            ...this.serviceState.navigation,
            items: state.navItems,
          },
        };

        this.store.dispatch(setLogo(state.logoItem));
        this.store.dispatch(setActiveItemId(state.activeItemId));
        this.notifyServiceListeners();
      })
    );

    this.serviceSubscriptions.add(
      rightNavControls$.subscribe((right) => {
        this.serviceState = {
          ...this.serviceState,
          header: {
            ...this.serviceState.header,
            navControls: { ...this.serviceState.header.navControls, right },
          },
        };
      })
    );

    const registerSidebarApp = (app: WorkspaceSidebarApp) => {
      this.serviceState = {
        ...this.serviceState,
        sidebar: {
          ...this.serviceState.sidebar,
          apps: sortSidebarApps(new Set(this.serviceState.sidebar.apps).add(app)),
        },
      };

      this.notifyServiceListeners();
    };

    const header: WorkspaceHeaderService = {
      getBreadcrumbs: () => this.serviceState.header.breadcrumbs,
      getState: () => this.serviceState.header,
    };

    const sidebar: WorkspaceSidebarService = {
      registerSidebarApp,
      getSidebarApps: () => this.serviceState.sidebar.apps,
      getSidebarApp: (appId: string | null) => {
        if (!appId) {
          return;
        }

        return this.serviceState.sidebar.apps.find((app) => app.appId === appId);
      },
      getState: () => this.serviceState.sidebar,
    };

    const navigation: WorkspaceNavigationService = {
      getState: () => this.serviceState.navigation,
      getItems: () => this.serviceState.navigation.items,
    };

    return {
      getState: () => this.serviceState,
      getStoreProvider:
        () =>
        ({ children }) =>
          React.createElement<ProviderProps>(Provider, { store: this.store }, children),
      isEnabled: () => true, // featureFlags.getBooleanValue('workbench', false),
      header,
      sidebar,
      navigation,
      subscribe: (listener: () => void) => {
        this.serviceListeners.add(listener);
        return () => {
          this.serviceListeners.delete(listener);
        };
      },
    };
  }

  public stop() {
    this.stop$.next();
    this.storeSubscriptions.unsubscribe();
    this.storeSubscriptions = new Subscription();
    this.store = createStore();
    this.serviceListeners.clear();
    // this.iconType$?.unsubscribe();
  }

  private notifyServiceListeners() {
    for (const listener of this.serviceListeners) {
      listener();
    }
  }
}
