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
  ChromeBreadcrumb,
  ChromeSetProjectBreadcrumbsParams,
  ChromeProjectNavigationNode,
  AppDeepLinkId,
  NavigationTreeDefinition,
  NavigationTreeDefinitionUI,
  CloudURLs,
  SolutionId,
} from '@kbn/core-chrome-browser';
import type { Observable } from 'rxjs';
import type { ChromeComponentsDeps } from '@kbn/core-chrome-browser-components';

/** @internal */
export type InternalChromeSetup = ChromeSetup;

/** @internal */
export interface InternalChromeStart extends ChromeStart {
  /**
   * Deps bag passed to `createChromeComponents` by the layout service.
   * @internal
   */
  componentDeps: ChromeComponentsDeps;

  /**
   * Used only by the rendering service to render the global footer UI (devbar)
   * @internal
   */
  getGlobalFooter$(): Observable<ReactNode>;

  /**
   * Used only by the serverless plugin to customize project-style chrome.
   * @internal
   */
  project: {
    /**
     * Sets the cloud's URLs.
     * @param cloudUrls
     */
    setCloudUrls(cloudUrls: CloudURLs): void;

    /**
     * Sets the Kibana name - project name for serverless, deployment name for ECH.
     * @param kibanaName
     */
    setKibanaName(kibanaName: string): void;

    initNavigation<
      LinkId extends AppDeepLinkId = AppDeepLinkId,
      Id extends string = string,
      ChildrenId extends string = Id
    >(
      id: SolutionId,
      navigationTree$: Observable<NavigationTreeDefinition<LinkId, Id, ChildrenId>>
    ): void;

    getNavigation$(): Observable<{
      solutionId: SolutionId;
      navigationTree: NavigationTreeDefinitionUI;
      activeNodes: ChromeProjectNavigationNode[][];
    }>;

    /** Get an Observable of the current project breadcrumbs */
    getBreadcrumbs$(): Observable<ChromeBreadcrumb[]>;

    /**
     * Set project breadcrumbs
     * @param breadcrumbs
     * @param params.absolute If true, If true, the breadcrumbs will replace the defaults, otherwise they will be appended to the default ones. false by default.
     *
     * Use {@link ServerlessPluginStart.setBreadcrumbs} to set project breadcrumbs.
     */
    setBreadcrumbs(
      breadcrumbs: ChromeBreadcrumb[] | ChromeBreadcrumb,
      params?: Partial<ChromeSetProjectBreadcrumbsParams>
    ): void;
  };
}
