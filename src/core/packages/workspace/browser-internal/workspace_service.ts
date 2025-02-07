/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  ReplaySubject,
  BehaviorSubject,
  takeUntil,
  map,
  Observable,
  distinctUntilChanged,
  Subscription,
} from 'rxjs';
import {
  type WorkspaceKnownTool,
  type WorkspaceTool,
  type WorkspaceStart,
  WORKSPACE_KNOWN_TOOLS,
} from '@kbn/core-workspace-browser';
import type { FeatureFlagsStart } from '@kbn/core-feature-flags-browser';
import type { InternalChromeStart } from '@kbn/core-chrome-browser-internal';
import type { HttpStart } from '@kbn/core-http-browser';
import type { CustomBranding } from '@kbn/core-custom-branding-common';
import {
  setIsLoading,
  setIsChromeVisible,
  store,
  setHomeHref,
  setIconType,
} from '@kbn/core-workspace-state';

const isKnownTool = (toolId: string): toolId is WorkspaceKnownTool => {
  return WORKSPACE_KNOWN_TOOLS.includes(toolId as WorkspaceKnownTool);
};

const sortTools = (tools: ReadonlySet<WorkspaceTool>) => {
  return Array.from(tools.values()).sort((a, b) => {
    if (isKnownTool(a.toolId) && isKnownTool(b.toolId)) {
      return WORKSPACE_KNOWN_TOOLS.indexOf(a.toolId) - WORKSPACE_KNOWN_TOOLS.indexOf(b.toolId);
    }

    if (isKnownTool(a.toolId)) {
      return -1;
    }

    if (isKnownTool(b.toolId)) {
      return 1;
    }

    return a.toolId.localeCompare(b.toolId);
  });
};

export interface WorkspaceServiceStartDeps {
  featureFlags: FeatureFlagsStart;
  chrome: {
    projectNavigation: Pick<
      InternalChromeStart['projectNavigation'],
      'getProjectHome$' | 'getProjectBreadcrumbs$'
    >;
    getIsVisible$: InternalChromeStart['getIsVisible$'];
  };
  http: {
    basePath: Pick<HttpStart['basePath'], 'prepend'>;
    getLoadingCount$: HttpStart['getLoadingCount$'];
  };
  customBranding: {
    customBranding$: Observable<Pick<CustomBranding, 'logo'>>;
  };
}

export class WorkspaceService {
  private readonly stop$ = new ReplaySubject<void>(1);
  private isLoading$: Subscription | null = null;
  private isVisible$: Subscription | null = null;
  private homeHref$: Subscription | null = null;
  private iconType$: Subscription | null = null;

  public start({
    featureFlags,
    chrome,
    http,
    customBranding,
  }: WorkspaceServiceStartDeps): WorkspaceStart {
    const tools$ = new BehaviorSubject<ReadonlySet<WorkspaceTool>>(new Set());
    const breadcrumbs$ = chrome.projectNavigation
      .getProjectBreadcrumbs$()
      .pipe(takeUntil(this.stop$));

    this.isLoading$ = http
      .getLoadingCount$()
      .pipe(
        map((count) => count > 0),
        distinctUntilChanged(),
        takeUntil(this.stop$)
      )
      .subscribe((isLoading) => {
        store.dispatch(setIsLoading(isLoading));
      });

    this.isVisible$ = chrome
      .getIsVisible$()
      .pipe(distinctUntilChanged(), takeUntil(this.stop$))
      .subscribe((isVisible) => {
        store.dispatch(setIsChromeVisible(isVisible));
      });

    this.homeHref$ = chrome.projectNavigation.getProjectHome$().subscribe((href) => {
      store.dispatch(setHomeHref(href || '/app/home'));
    });

    this.iconType$ = customBranding.customBranding$
      .pipe(
        map((branding) => {
          return branding.logo || 'logoElastic';
        }),
        takeUntil(this.stop$)
      )
      .subscribe((iconType) => {
        store.dispatch(setIconType(iconType));
      });

    return {
      isEnabled: () => featureFlags.getBooleanValue('workbench', false),
      header: {
        getBreadcrumbs$: () => breadcrumbs$,
      },
      toolbox: {
        registerTool: (tool: WorkspaceTool) => {
          tools$.next(new Set([...tools$.value.values(), tool]));
        },
        getTools$: () => {
          return tools$.pipe(map(sortTools), takeUntil(this.stop$));
        },
        getTool$: (toolId: string | null) => {
          return tools$.pipe(
            map((tools) => Array.from(tools).find((tool) => tool.toolId === toolId)),
            takeUntil(this.stop$)
          );
        },
      },
    };
  }

  public stop() {
    this.stop$.next();
    this.isLoading$?.unsubscribe();
    this.isVisible$?.unsubscribe();
    this.homeHref$?.unsubscribe();
    this.iconType$?.unsubscribe();
  }
}
