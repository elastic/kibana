/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ReactNode } from 'react';
import type { Observable } from 'rxjs';
import type { ApplicationStart } from '@kbn/core-application-browser';
import type { DocLinksStart } from '@kbn/core-doc-links-browser';
import type { HttpStart } from '@kbn/core-http-browser';
import type { CustomBranding } from '@kbn/core-custom-branding-common';
import type { AppMenuConfig } from '@kbn/core-chrome-app-menu-components';
import type { MountPoint } from '@kbn/core-mount-utils-browser';
import type { RecentlyAccessedHistoryItem } from '@kbn/recently-accessed';
import type {
  ChromeSetup,
  ChromeStart,
  ChromeBadge,
  ChromeBreadcrumb,
  ChromeBreadcrumbsAppendExtension,
  ChromeGlobalHelpExtensionMenuLink,
  ChromeHelpExtension,
  ChromeHelpMenuLink,
  ChromeNavControl,
  ChromeNavLink,
  ChromeProjectNavigationNode,
  ChromeSetProjectBreadcrumbsParams,
  ChromeUserBanner,
  AppDeepLinkId,
  NavigationTreeDefinition,
  NavigationTreeDefinitionUI,
  CloudURLs,
  SolutionId,
} from '@kbn/core-chrome-browser';

// ---------------------------------------------------------------------------
// Types previously in @kbn/core-chrome-browser-components/context.tsx
// Moved here to break the circular dependency:
//   browser-internal-types -> browser-components -> browser-context -> browser-internal-types
// ---------------------------------------------------------------------------

/** @internal */
export interface ChromeComponentsConfig {
  isServerless: boolean;
  kibanaVersion: string;
  /** @deprecated Will be removed — compute from `basePath.prepend('/app/home')` instead. */
  homeHref: string;
  /** @deprecated Will be removed — read `docLinks.links.kibana.guide` instead. */
  kibanaDocLink: string;
}

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

interface NavControlsObservables {
  left$: Observable<ChromeNavControl[]>;
  center$: Observable<ChromeNavControl[]>;
  right$: Observable<ChromeNavControl[]>;
  extension$: Observable<ChromeNavControl[]>;
}

interface ClassicChromeObservables {
  /** User-set breadcrumbs via {@link ChromeStart.setBreadcrumbs}. */
  breadcrumbs$: Observable<ChromeBreadcrumb[]>;
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

// ---------------------------------------------------------------------------
// Internal chrome service types
// ---------------------------------------------------------------------------

/** @internal */
export type InternalChromeSetup = ChromeSetup;

/** @internal */
export interface InternalChromeStart extends ChromeStart {
  /**
   * Deps passed to `ChromeComponentsProvider` by the layout service.
   * Will be removed once all fields are migrated to useChromeService() reads.
   */
  componentDeps: ChromeComponentsDeps;

  /**
   * Returns static chrome configuration assembled during `ChromeService.start()`.
   */
  getConfig(): {
    isServerless: boolean;
    kibanaVersion: string;
    homeHref: string;
    kibanaDocLink: string;
  };

  /**
   * Get an observable of the current badge.
   * Only consumed by chrome components; plugins use `setBadge()`.
   */
  getBadge$(): Observable<ChromeBadge | undefined>;

  /**
   * Get an observable of the current header banner object.
   * Public consumers should use `hasHeaderBanner$()` instead.
   */
  getHeaderBanner$(): Observable<ChromeUserBanner | undefined>;

  /**
   * Get an observable of breadcrumb append extensions merged with badge extensions.
   * Unlike `getBreadcrumbsAppendExtensions$()` (public), this includes badges
   * converted to extensions. Used by chrome layout components.
   */
  getBreadcrumbsAppendExtensionsWithBadges$(): Observable<ChromeBreadcrumbsAppendExtension[]>;

  /** Set global footer. Used by the developer toolbar. */
  setGlobalFooter(node: ReactNode): void;

  /** Get an observable of the global footer node (devbar). */
  getGlobalFooter$(): Observable<ReactNode>;

  /** Project-style chrome APIs, used by the serverless plugin. */
  project: {
    /** Sets the cloud URLs for the project navigation. */
    setCloudUrls(cloudUrls: CloudURLs): void;

    /** Sets the Kibana name (project name for serverless, deployment name for ECH). */
    setKibanaName(kibanaName: string): void;

    /** Initialise project navigation from a definition tree. */
    initNavigation<
      LinkId extends AppDeepLinkId = AppDeepLinkId,
      Id extends string = string,
      ChildrenId extends string = Id
    >(
      id: SolutionId,
      navigationTree$: Observable<NavigationTreeDefinition<LinkId, Id, ChildrenId>>
    ): void;

    /** Get an observable of the resolved project navigation tree and active nodes. */
    getNavigation$(): Observable<{
      solutionId: SolutionId;
      navigationTree: NavigationTreeDefinitionUI;
      activeNodes: ChromeProjectNavigationNode[][];
    }>;

    /** Get an observable of the current project breadcrumbs. */
    getBreadcrumbs$(): Observable<ChromeBreadcrumb[]>;

    /** Get an observable of the project home URL derived from the navigation tree. */
    getProjectHome$(): Observable<string>;

    /**
     * Set project breadcrumbs.
     * @param breadcrumbs - Breadcrumb(s) to set.
     * @param params.absolute If true, replaces defaults; otherwise appends. Defaults to false.
     */
    setBreadcrumbs(
      breadcrumbs: ChromeBreadcrumb[] | ChromeBreadcrumb,
      params?: Partial<ChromeSetProjectBreadcrumbsParams>
    ): void;
  };
}
