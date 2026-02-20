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
import type { AppMenuConfig } from '@kbn/core-chrome-app-menu-components';
import type { ChromeNavLink, ChromeNavLinks } from './nav_links';
import type { ChromeRecentlyAccessed } from './recently_accessed';
import type { ChromeDocTitle } from './doc_title';
import type { ChromeHelpMenuLink, ChromeNavControls } from './nav_controls';
import type { ChromeHelpExtension } from './help_extension';
import type {
  ChromeBreadcrumb,
  ChromeBreadcrumbsAppendExtension,
  ChromeSetBreadcrumbsParams,
} from './breadcrumb';
import type { ChromeBadge, ChromeBreadcrumbsBadge, ChromeStyle, ChromeUserBanner } from './types';
import type { ChromeGlobalHelpExtensionMenuLink } from './help_extension';
import type { SolutionId } from './project_navigation';
import type { SidebarStart, SidebarSetup } from './sidebar';

export interface ChromeSetup {
  /**
   * {@link SidebarSetup}
   */
  sidebar: SidebarSetup;
}

/**
 * ChromeSetup exposes APIs available during the setup phase.
 * @public
 */
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ChromeSetup {}

/**
 * ChromeStart allows plugins to customize the global chrome header UI and
 * enrich the UX with additional information about the current location of the
 * browser.
 *
 * @remarks
 * While ChromeStart exposes many APIs, they should be used sparingly and the
 * developer should understand how they affect other plugins and applications.
 *
 * @example
 * How to add a recently accessed item to the sidebar:
 * ```ts
 * core.chrome.recentlyAccessed.add('/app/map/1234', 'Map 1234', '1234');
 * ```
 *
 * @example
 * How to set the help dropdown extension:
 * ```tsx
 * core.chrome.setHelpExtension(elem => {
 *   ReactDOM.render(<MyHelpComponent />, elem);
 *   return () => ReactDOM.unmountComponentAtNode(elem);
 * });
 * ```
 *
 * @public
 */
export interface ChromeStart {
  /** {@inheritdoc ChromeNavLinks} */
  navLinks: ChromeNavLinks;
  /** {@inheritdoc ChromeNavControls} */
  navControls: ChromeNavControls;
  /** {@inheritdoc ChromeRecentlyAccessed} */
  recentlyAccessed: ChromeRecentlyAccessed;
  /** {@inheritdoc ChromeDocTitle} */
  docTitle: ChromeDocTitle;

  /**
   * Get an observable of the current visibility state of the chrome.
   */
  getIsVisible$(): Observable<boolean>;

  /**
   * Set the temporary visibility for the chrome. This does nothing if the chrome is hidden
   * by default and should be used to hide the chrome for things like full-screen modes
   * with an exit button.
   */
  setIsVisible(isVisible: boolean): void;

  /**
   * Get an observable of the current badge
   */
  getBadge$(): Observable<ChromeBadge | undefined>;

  /**
   * Override the current badge
   */
  setBadge(badge?: ChromeBadge): void;

  /**
   * Set global footer; Meant to be used by developer toolbar
   */
  setGlobalFooter(node: ReactNode): void;

  /**
   * Get an observable of the current list of breadcrumbs
   */
  getBreadcrumbs$(): Observable<ChromeBreadcrumb[]>;

  /**
   * Override the current set of breadcrumbs
   */
  setBreadcrumbs(newBreadcrumbs: ChromeBreadcrumb[], params?: ChromeSetBreadcrumbsParams): void;

  /**
   * Get an observable of the current app menu configuration
   */
  getAppMenu$(): Observable<AppMenuConfig | undefined>;

  /**
   * Set the app menu configuration for the current application.
   *
   * @example
   *```tsx
   * import React, { useEffect } from 'react';
   * import type { AppMenuConfig } from '@kbn/core-chrome-app-menu-components';
   * import type { CoreStart } from '@kbn/core/public';
   *
   * interface Props {
   *  config: AppMenuConfig;
   *  core: CoreStart;
   *}
   *
   * const Example = ({ config, core }: Props) => {
   *  const { chrome } = core;
   *
   *  useEffect(() => {
   *    chrome.setAppMenu(config);
   *  }, [chrome.setAppMenu, config]);
   *
   *  return <div>Hello world!</div>;
   * };
   */
  setAppMenu(config?: AppMenuConfig): void;

  /**
   * Get an observable of the current extensions appended to breadcrumbs
   */
  getBreadcrumbsAppendExtensions$(): Observable<ChromeBreadcrumbsAppendExtension[]>;

  /**
   * Mount an element next to the last breadcrumb
   */
  setBreadcrumbsAppendExtension(
    breadcrumbsAppendExtension: ChromeBreadcrumbsAppendExtension
  ): () => void;

  /**
   * Set badges to be displayed in the breadcrumbs area.
   * The badges will always be displayed as the last {@link ChromeBreadcrumbsAppendExtension} in the breadcrumbs.
   * By default, when navigating within the same application, badges are not cleared automatically, you need to handle
   * their removal manually.
   *
   * @param badges - Array of {@link ChromeBreadcrumbsBadge} to display in the breadcrumbs area.
   *
   * @example
   * ```tsx
   * useEffect(() => {
   *  const badges: ChromeBreadcrumbsBadge[] = [
   *   { badgeText: 'Example', color: '#F6E58D' },
   *  ];
   *
   *  core.chrome.setBreadcrumbsBadges(badges);
   *
   *  return () => {
   *    // Clear badges when component unmounts
   *    core.chrome.setBreadcrumbsBadges([]);
   *  };
   * }, [core.chrome]);
   * ```
   */
  setBreadcrumbsBadges(badges: ChromeBreadcrumbsBadge[]): void;

  /**
   * Get an observable of the current custom nav link
   */
  getCustomNavLink$(): Observable<Partial<ChromeNavLink> | undefined>;

  /**
   * Override the current set of custom nav link
   */
  setCustomNavLink(newCustomNavLink?: Partial<ChromeNavLink>): void;

  /**
   * Override the default links shown in the help menu
   */
  setHelpMenuLinks(links: ChromeHelpMenuLink[]): void;

  /**
   * Get the list of the registered global help extension menu links
   */
  getGlobalHelpExtensionMenuLinks$(): Observable<ChromeGlobalHelpExtensionMenuLink[]>;

  /**
   * Append a global help extension menu link
   */
  registerGlobalHelpExtensionMenuLink(
    globalHelpExtensionMenuLink: ChromeGlobalHelpExtensionMenuLink
  ): void;

  /**
   * Get an observable of the current custom help content
   */
  getHelpExtension$(): Observable<ChromeHelpExtension | undefined>;

  /**
   * Override the current set of custom help content
   */
  setHelpExtension(helpExtension?: ChromeHelpExtension): void;

  /**
   * Override the default support URL shown in the help menu
   * @param url The updated support URL
   */
  setHelpSupportUrl(url: string): void;

  /**
   * Get the support URL shown in the help menu
   */
  getHelpSupportUrl$(): Observable<string>;

  /**
   * Set the banner that will appear on top of the chrome header.
   *
   * @remarks Using `undefined` when invoking this API will remove the banner.
   */
  setHeaderBanner(headerBanner?: ChromeUserBanner): void;

  /**
   * Get an observable of the current header banner presence state.
   */
  hasHeaderBanner$(): Observable<boolean>;

  /**
   * Sets the style type of the chrome.
   * @param style The style type to apply to the chrome.
   */
  setChromeStyle(style: ChromeStyle): void;

  /**
   * Get an observable of the current style type of the chrome.
   */
  getChromeStyle$(): Observable<ChromeStyle>;

  sideNav: {
    /**
     * Get an observable of the current collapsed state of the side nav.
     */
    getIsCollapsed$(): Observable<boolean>;

    /**
     * Set the collapsed state of the side nav.
     * @param isCollapsed The collapsed state of the side nav.
     */
    setIsCollapsed(isCollapsed: boolean): void;
  };

  /**
   * {@link SidebarStart}
   */
  sidebar: SidebarStart;

  /**
   * Get the id of the currently active project navigation or `null` otherwise.
   */
  getActiveSolutionNavId$(): Observable<SolutionId | null>;

  /**
   * Used only by the rendering service and KibanaRenderingContextProvider to wrap the rendering tree in the Chrome context providers
   */
  withProvider(component: ReactNode): ReactNode;
}
