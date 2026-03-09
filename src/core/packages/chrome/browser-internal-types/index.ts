/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ReactNode } from 'react';
import type {
  ChromeSetup,
  ChromeStart,
  ChromeBadge,
  ChromeBreadcrumb,
  ChromeSetProjectBreadcrumbsParams,
  ChromeProjectNavigationNode,
  ChromeUserBanner,
  AppDeepLinkId,
  NavigationTreeDefinition,
  NavigationTreeDefinitionUI,
  CloudURLs,
  SolutionId,
} from '@kbn/core-chrome-browser';
import type { Observable } from 'rxjs';

// TODO: Remove this dependency once ChromeComponentsDeps is fully migrated
// to useChromeService() reads
// At that point componentDeps can be removed from InternalChromeStart
// and internal-types becomes a pure leaf depending only on @kbn/core-chrome-browser.
import type {
  ChromeComponentsConfig,
  ChromeComponentsDeps,
} from '@kbn/core-chrome-browser-components';

export type { ChromeComponentsConfig };

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
  getConfig(): ChromeComponentsConfig;

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
