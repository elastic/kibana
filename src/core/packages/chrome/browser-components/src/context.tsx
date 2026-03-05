/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FC, PropsWithChildren } from 'react';
import React, { createContext, useContext } from 'react';
import type { Observable } from 'rxjs';
import type { ApplicationStart } from '@kbn/core-application-browser';
import type { DocLinksStart } from '@kbn/core-doc-links-browser';
import type { HttpStart } from '@kbn/core-http-browser';
import type {
  ChromeBadge,
  ChromeBreadcrumb,
  ChromeBreadcrumbsAppendExtension,
  ChromeGlobalHelpExtensionMenuLink,
  ChromeHelpExtension,
  ChromeHelpMenuLink,
  ChromeNavControl,
  ChromeNavLink,
  ChromeProjectNavigationNode,
  ChromeUserBanner,
  NavigationTreeDefinitionUI,
  SolutionId,
} from '@kbn/core-chrome-browser';
import type { CustomBranding } from '@kbn/core-custom-branding-common';
import type { AppMenuConfig } from '@kbn/core-chrome-app-menu-components';
import type { MountPoint } from '@kbn/core-mount-utils-browser';
import type { RecentlyAccessedHistoryItem } from '@kbn/recently-accessed';

/**
 * Minimal application contract needed by Chrome components.
 * Replaces `InternalApplicationStart` to break the dependency on the private
 * `@kbn/core-application-browser-internal` package.
 */
export interface ChromeApplicationContext
  extends Pick<ApplicationStart, 'navigateToApp' | 'navigateToUrl' | 'currentAppId$'> {
  /** Current app's action menu mount point. */
  currentActionMenu$: Observable<MountPoint<HTMLElement> | undefined>;
}

interface ChromeComponentsConfig {
  isServerless: boolean;
  kibanaVersion: string;
  homeHref: string;
  kibanaDocLink: string;
}

interface NavControlsObservables {
  left$: Observable<ChromeNavControl[]>;
  center$: Observable<ChromeNavControl[]>;
  right$: Observable<ChromeNavControl[]>;
  extension$: Observable<ChromeNavControl[]>;
}

interface ClassicChromeObservables {
  /** User-set breadcrumbs via {@link ChromeStart.setBreadcrumbs}. */
  breadcrumbs$: Observable<ChromeBreadcrumb[]>;
  /** @todo Consolidate into {@link ChromeComponentsDeps.breadcrumbsAppendExtensions$} — see https://github.com/elastic/kibana/issues/256050 */
  badge$: Observable<ChromeBadge | undefined>;
  recentlyAccessed$: Observable<RecentlyAccessedHistoryItem[]>;
  customNavLink$: Observable<ChromeNavLink | undefined>;
}

interface ProjectChromeObservables {
  /** Auto-generated breadcrumbs derived from the active nav tree node. */
  breadcrumbs$: Observable<ChromeBreadcrumb[]>;
  homeHref$: Observable<string>;
  navigation$: Observable<{
    solutionId: SolutionId;
    navigationTree: NavigationTreeDefinitionUI;
    activeNodes: ChromeProjectNavigationNode[][];
  }>;
  isEditing$: Observable<boolean>;
}

export interface ChromeComponentsDeps {
  config: ChromeComponentsConfig;
  application: ChromeApplicationContext;
  basePath: HttpStart['basePath'];
  docLinks: DocLinksStart;
  navControls: NavControlsObservables;
  /** Classic-layout-specific chrome state. */
  classic: ClassicChromeObservables;
  /** Project/solution-layout-specific chrome state. */
  project: ProjectChromeObservables;
  loadingCount$: Observable<number>;
  helpMenu: {
    menuLinks$: Observable<ChromeHelpMenuLink[]>;
    extension$: Observable<ChromeHelpExtension | undefined>;
    supportUrl$: Observable<string>;
    globalExtensionMenuLinks$: Observable<ChromeGlobalHelpExtensionMenuLink[]>;
  };
  navLinks$: Observable<ChromeNavLink[]>;
  customBranding$: Observable<CustomBranding>;
  breadcrumbsAppendExtensions$: Observable<ChromeBreadcrumbsAppendExtension[]>;
  appMenu$: Observable<AppMenuConfig | undefined>;
  headerBanner$: Observable<ChromeUserBanner | undefined>;
  sideNav: {
    collapsed$: Observable<boolean>;
    initialCollapsed: boolean;
    onToggleCollapsed: (collapsed: boolean) => void;
  };
}

const ChromeComponentsContext = createContext<ChromeComponentsDeps | null>(null);

/**
 * Provides `ChromeComponentsDeps` to all context-aware Chrome components (`Header`,
 * `ProjectHeader`, `GridLayoutProjectSideNav`, `HeaderTopBanner`, `ChromelessHeader`,
 * `AppMenuBar`, `Sidebar`). Wrap the layout tree once with `chrome.componentDeps`.
 *
 * @temporary This provider is a stepping stone toward a proper `ChromeStateProvider` that will
 * expose React hooks (`useChromeStyle`, `useChromeBreadcrumbs`, etc.) and allow components to
 * self-hydrate without Observable props. Once that package exists this provider can be replaced.
 * @see kibana-team#2651 (Chrome & Grid Evolution epic — private repo)
 */
export const ChromeComponentsProvider: FC<PropsWithChildren<{ value: ChromeComponentsDeps }>> = ({
  value,
  children,
}) => <ChromeComponentsContext.Provider value={value}>{children}</ChromeComponentsContext.Provider>;

/**
 * Reads `ChromeComponentsDeps` from the nearest `ChromeComponentsProvider`.
 * Throws if called outside the provider.
 *
 * @temporary See `ChromeComponentsProvider` for the migration plan.
 */
export const useChromeComponentsDeps = (): ChromeComponentsDeps => {
  const ctx = useContext(ChromeComponentsContext);
  if (!ctx) throw new Error('useChromeComponentsDeps must be used within ChromeComponentsProvider');
  return ctx;
};
