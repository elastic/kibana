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
import type { IBasePath } from '@kbn/core-http-browser';
import type { MountPoint } from '@kbn/core-mount-utils-browser';
import type {
  ChromeSetup,
  ChromeStart,
  AppHeaderConfig,
  ChromeBadge,
  ChromeBreadcrumb,
  ChromeBreadcrumbsAppendExtension,
  ChromeBreadcrumbsBadge,
  ChromeNext,
  GlobalHeaderAiButton,
  ChromeProjectNavigationNode,
  ChromeSetProjectBreadcrumbsParams,
  ChromeUserBanner,
  GlobalSearchConfig,
  AppDeepLinkId,
  NavigationCustomization,
  NavigationTreeDefinition,
  NavigationTreeDefinitionUI,
  CloudURLs,
  SolutionId,
} from '@kbn/core-chrome-browser';

/**
 * Cross-plugin navigation references collected from a solution nav tree.
 * @internal
 */
export interface NavTreeDependencies {
  /** Id of the plugin that registered the solution nav tree. */
  ownerPluginId: string;
  /** `link` targets referenced by the tree (app ids or deep-link ids). */
  linkTargets: string[];
}

/** @internal */
export type InternalChromeSetup = ChromeSetup;

/** @internal */
export interface InternalChromeStart extends ChromeStart {
  /**
   * Dependencies used by Chrome-owned React components that live outside
   * `browser-internal`, but still render under `ChromeServiceProvider`.
   */
  componentDeps: {
    readonly basePath: IBasePath;
    readonly legacyActionMenu$: Observable<MountPoint | undefined>;
  };

  sideNav: ChromeStart['sideNav'] & {
    /**
     * Set the width of the side nav.
     * @param width The width of the side nav in pixels.
     */
    setWidth(width: number): void;
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

  /**
   * Get an observable of the current breadcrumbs badges set via setBreadcrumbsBadges().
   */
  getBreadcrumbsBadges$(): Observable<ChromeBreadcrumbsBadge[]>;

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
      overflowItemIds: string[];
      /** Default top-level item IDs before any user customization is applied. */
      defaultItemIds: string[];
      /**
       * Top-level body nodes the sidebar will actually render: home node excluded,
       * hidden nodes removed, and panel-openers with no visible descendants pruned.
       */
      renderableNodes: ChromeProjectNavigationNode[];
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

    /**
     * Set navigation customization for live preview.
     * Pass undefined to clear the customization and revert to the original order.
     */
    setNavigationCustomization(customization: NavigationCustomization | undefined): void;

    /** Observable that emits the customize navigation handler when registered by the navigation plugin. */
    getCustomizeNavigationHandler$(): Observable<(() => void) | null>;

    /** Register the handler that opens the navigation customization modal. Called once by the navigation plugin. */
    registerCustomizeNavigationHandler(handler: () => void): void;

    /**
     * Register a solution nav tree so Core can (in development builds) track the cross-plugin
     * `link` references it declares. No-op in production builds. Called by the navigation and
     * serverless plugins for every tree that provides an `ownerPluginId`.
     */
    registerNavTreeDependencies(
      ownerPluginId: string,
      navigationTree$: Observable<NavigationTreeDefinition>
    ): void;

    /**
     * Return the latest cross-plugin navigation references collected from all registered solution
     * nav trees. Empty in production builds. Consumed by the navigation-dependency snapshot.
     */
    getNavTreeDependencies(): NavTreeDependencies[];
  };

  /** @internal Extends public `next` with `get$` for Chrome layout components. */
  next: InternalChromeNext;
}

/** @internal */
export interface InternalChromeNext extends ChromeNext {
  aiButton: ChromeNext['aiButton'] & {
    get$(): Observable<GlobalHeaderAiButton[]>;
  };
  contextSwitcher: ChromeNext['contextSwitcher'] & {
    get$(): Observable<ReactNode>;
  };
  globalSearch: ChromeNext['globalSearch'] & {
    get$(): Observable<GlobalSearchConfig | undefined>;
  };
  inlineAppHeader: {
    get$(): Observable<boolean>;
    set(mounted: boolean): void;
  };
  appHeader: ChromeNext['appHeader'] & {
    get$(): Observable<AppHeaderConfig | undefined>;
  };
  userMenu: ChromeNext['userMenu'] & {
    get$(): Observable<ReactNode>;
  };
}
