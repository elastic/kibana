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
   * Use {@link ServerlessPluginStart.setSideNavComponent} to set serverless navigation.
   */
  project: {
    /**
     * Sets the project navigation config to be used for rendering project navigation.
     * It is used for default project sidenav, project breadcrumbs, tracking active deep link.
     * @param projectNavigation The project navigation config
     *
     * @remarks Has no effect if the chrome style is not `project`.
     */
    setNavigation(projectNavigation: ChromeProjectNavigation): void;

    /**
     * Set custom project sidenav component to be used instead of the default project sidenav.
     * @param getter A function returning a CustomNavigationComponent.
     * This component will receive Chrome navigation state as props (not yet implemented)
     *
     * @remarks Has no effect if the chrome style is not `project`.
     */
    setSideNavComponent(component: SideNavComponent | null): void;
  };
}
