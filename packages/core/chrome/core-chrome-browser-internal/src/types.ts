/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type {
  ChromeProjectNavigation,
  ChromeStart,
  SideNavComponent,
  ChromeProjectBreadcrumb,
  ChromeSetProjectBreadcrumbsParams,
} from '@kbn/core-chrome-browser';
import { ChromeProjectNavigationNode } from '@kbn/core-chrome-browser/src';
import type { Observable } from 'rxjs';

/** @internal */
export interface InternalChromeStart extends ChromeStart {
  /**
   * Used only by the rendering service to render the header UI
   * @internal
   */
  getHeaderComponent(): JSX.Element;

  /**
   * Used only by the rendering service to retrieve the set of classNames
   * that will be set on the body element.
   * @internal
   */
  getBodyClasses$(): Observable<string[]>;

  /**
   * Used only by the serverless plugin to customize project-style chrome.
   * @internal
   */
  project: {
    /**
     * Sets the project home href string.
     * @param homeHref
     *
     * Use {@link ServerlessPluginStart.setProjectHome} to set project home.
     */
    setHome(homeHref: string): void;

    /**
     * Sets the cloud's projects page.
     * @param projectsUrl
     */
    setProjectsUrl(projectsUrl: string): void;

    /**
     * Sets the project navigation config to be used for rendering project navigation.
     * It is used for default project sidenav, project breadcrumbs, tracking active deep link.
     * @param projectNavigation The project navigation config
     *
     * Use {@link ServerlessPluginStart.setNavigation} to set project navigation config.
     */
    setNavigation(projectNavigation: ChromeProjectNavigation): void;

    /**
     * Returns an observable of the active nodes in the project navigation.
     */
    getActiveNavigationNodes$(): Observable<ChromeProjectNavigationNode[][]>;

    /**
     * Set custom project sidenav component to be used instead of the default project sidenav.
     * @param component A getter function returning a CustomNavigationComponent.
     *
     * @remarks This component will receive Chrome navigation state as props (not yet implemented)
     *
     * Use {@link ServerlessPluginStart.setSideNavComponent} to set custom project navigation.
     */
    setSideNavComponent(component: SideNavComponent | null): void;

    /**
     * Set project breadcrumbs
     * @param breadcrumbs
     * @param params.absolute If true, If true, the breadcrumbs will replace the defaults, otherwise they will be appended to the default ones. false by default.
     *
     * Use {@link ServerlessPluginStart.setBreadcrumbs} to set project breadcrumbs.
     */
    setBreadcrumbs(
      breadcrumbs: ChromeProjectBreadcrumb[] | ChromeProjectBreadcrumb,
      params?: Partial<ChromeSetProjectBreadcrumbsParams>
    ): void;
  };
}
