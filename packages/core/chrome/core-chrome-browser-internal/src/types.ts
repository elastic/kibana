/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type {
  ChromeStart,
  SideNavComponent,
  ChromeProjectBreadcrumb,
  ChromeSetProjectBreadcrumbsParams,
  ChromeProjectNavigationNode,
  AppDeepLinkId,
  NavigationTreeDefinition,
  NavigationTreeDefinitionUI,
  CloudURLs,
  SolutionNavigationDefinitions,
} from '@kbn/core-chrome-browser';
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
     * Sets the cloud's URLs.
     * @param cloudUrls
     */
    setCloudUrls(cloudUrls: CloudURLs): void;

    /**
     * Sets the project name.
     * @param projectName
     */
    setProjectName(projectName: string): void;

    initNavigation<
      LinkId extends AppDeepLinkId = AppDeepLinkId,
      Id extends string = string,
      ChildrenId extends string = Id
    >(
      id: string,
      navigationTree$: Observable<NavigationTreeDefinition<LinkId, Id, ChildrenId>>
    ): void;

    getNavigationTreeUi$: () => Observable<NavigationTreeDefinitionUI>;

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

    /**
     * Update the solution navigation definitions.
     *
     * @param solutionNavs The solution navigation definitions to update.
     * @param replace Flag to indicate if the previous solution navigation definitions should be replaced.
     * If `false`, the new solution navigation definitions will be merged with the existing ones.
     */
    updateSolutionNavigations(solutionNavs: SolutionNavigationDefinitions, replace?: boolean): void;

    /**
     * Change the active solution navigation.
     *
     * @param id The id of the active solution navigation. If `null` is provided, the solution navigation
     * will be replaced with the legacy Kibana navigation.
     */
    changeActiveSolutionNavigation(
      id: string | null,
      options?: {
        /** only change if there isn't any active solution yet */
        onlyIfNotSet?: boolean;
        /** redirect to the new navigation home page */
        redirect?: boolean;
      }
    ): void;
  };
}
