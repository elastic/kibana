/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { JSX, ReactNode } from 'react';
import type {
  ChromeSetup,
  ChromeStart,
  ChromeBreadcrumb,
  ChromeSetProjectBreadcrumbsParams,
  ChromeProjectNavigationNode,
  AppDeepLinkId,
  NavigationTreeDefinition,
  NavigationTreeDefinitionUI,
  NavigationOrdering,
  NavigationItemInfo,
  CloudURLs,
  SolutionNavigationDefinitions,
  SolutionId,
} from '@kbn/core-chrome-browser';
import type { Observable } from 'rxjs';

/** @internal */
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface InternalChromeSetup extends ChromeSetup {}

/** @internal */
export interface InternalChromeStart extends ChromeStart {
  /**
   * Used only by the rendering service to render the header UI
   * @internal
   *
   * @remarks
   * Header that is used with the "classic" navigation.
   * It includes the header and the overlay classic navigation.
   * It doesn't include the banner or the chromeless header state, which are rendered separately by the layout service.
   *
   * @deprecated - clean up https://github.com/elastic/kibana/issues/225264
   */
  getClassicHeaderComponent(): JSX.Element;

  /**
   * Used only by the rendering service to render the header UI
   * @internal
   *
   * @remarks
   * Header that is used with the "project" navigation (solution and serverless)
   * It includes the header.
   * It doesn't include the banner or the chromeless header state, which are rendered separately by the layout service.
   * @deprecated - clean up https://github.com/elastic/kibana/issues/225264
   */
  getProjectHeaderComponent(): JSX.Element;

  /**
   * Used only by the rendering service to render the project side navigation UI
   *
   * @deprecated - clean up https://github.com/elastic/kibana/issues/225264
   */
  getProjectSideNavComponent(): JSX.Element;

  /**
   * Used only by the rendering service to render the header banner UI
   * @internal
   *
   * @remarks
   * Can be used by layout service to render a banner separate from the header.
   *
   * @deprecated - clean up https://github.com/elastic/kibana/issues/225264
   */
  getHeaderBanner(): JSX.Element;

  /**
   * Used only by the rendering service to render the chromeless header UI
   * @internal
   *
   * @remarks
   * Includes global loading indicator for chromeless state.
   *
   * @deprecated - clean up https://github.com/elastic/kibana/issues/225264
   */
  getChromelessHeader(): JSX.Element;

  /**
   * Used only by the rendering service to render the project app menu UI
   * @internal
   *
   * @deprecated - clean up https://github.com/elastic/kibana/issues/225264
   */
  getProjectAppMenuComponent(): JSX.Element;

  /**
   * Used only by the rendering service to render the sidebar UI
   * @internal
   */
  getSidebarComponent(): JSX.Element;

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
     * Sets the feedback URL parameters.
     * @param feedbackUrlParams
     */
    setFeedbackUrlParams(feedbackUrlParams: URLSearchParams): void;

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
      navigationTree$: Observable<NavigationTreeDefinition<LinkId, Id, ChildrenId>>,
      config?: { dataTestSubj?: string }
    ): void;

    getNavigationTreeUi$: () => Observable<NavigationTreeDefinitionUI>;

    /**
     * Returns a simplified list of navigation items for the customize navigation modal.
     */
    getNavigationItems$: () => Observable<NavigationItemInfo[]>;

    /**
     * Returns an observable of the active nodes in the project navigation.
     */
    getActiveNavigationNodes$(): Observable<ChromeProjectNavigationNode[][]>;

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

    /**
     * Update the solution navigation definitions.
     *
     * @param solutionNavs The solution navigation definitions to update.
     * @param replace Flag to indicate if the previous solution navigation definitions should be replaced.
     * If `false`, the new solution navigation definitions will be merged with the existing ones.
     */
    updateSolutionNavigations(solutionNavs: SolutionNavigationDefinitions, replace?: boolean): void;

    /**
     * Set navigation ordering for a solution.
     * Pass undefined to clear the ordering and revert to the original order.
     *
     * @param id The solution id to set the ordering for.
     * @param ordering The ordering configuration (order array and hidden IDs), or undefined to reset.
     */
    setNavigationOrdering(id: SolutionId, ordering: NavigationOrdering | undefined): void;

    /**
     * Set a temporary navigation ordering for live preview without persisting to storage.
     * Call clearTemporaryOrdering to revert, or setNavigationOrdering to persist.
     *
     * @param id The solution id to set the temporary ordering for.
     * @param ordering The ordering configuration for preview.
     */
    setTemporaryOrdering(id: SolutionId, ordering: NavigationOrdering): void;

    /**
     * Clear the temporary navigation ordering and revert to the persisted state.
     *
     * @param id The solution id to clear the temporary ordering for.
     */
    clearTemporaryOrdering(id: SolutionId): void;

    /**
     * Set whether navigation is being edited (customization modal is open).
     * When true, the primary menu renders in a portal above the modal overlay.
     *
     * @param isEditing Whether navigation editing mode is active.
     */
    setIsEditing(isEditing: boolean): void;

    /**
     * Get an observable for whether navigation is being edited.
     */
    getIsEditing$(): Observable<boolean>;

    /**
     * Change the active solution navigation.
     *
     * @param id The id of the active solution navigation. If `null` is provided, the solution navigation
     * will be replaced with the legacy Kibana navigation.
     */
    changeActiveSolutionNavigation(id: SolutionId | null): void;
  };
}
