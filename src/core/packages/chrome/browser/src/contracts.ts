/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Observable } from 'rxjs';
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
import type { ChromeBadge, ChromeStyle, ChromeUserBanner } from './types';
import type { ChromeGlobalHelpExtensionMenuLink } from './help_extension';
import type { PanelSelectedNode } from './project_navigation';

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
   * Get an observable of the current list of breadcrumbs
   */
  getBreadcrumbs$(): Observable<ChromeBreadcrumb[]>;

  /**
   * Override the current set of breadcrumbs
   */
  setBreadcrumbs(newBreadcrumbs: ChromeBreadcrumb[], params?: ChromeSetBreadcrumbsParams): void;

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
   * Get an observable of the current locked state of the nav drawer.
   */
  getIsNavDrawerLocked$(): Observable<boolean>;

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

    /**
     * Get an observable of the selected nav node that opens the side nav panel.
     */
    getPanelSelectedNode$: () => Observable<PanelSelectedNode | null>;

    /**
     * Set the selected nav node that opens the side nav panel.
     *
     * @param node The selected nav node that opens the side nav panel. If a string is provided,
     * it will be used as the **id** of the selected nav node. If `null` is provided, the side nav panel
     * will be closed.
     */
    setPanelSelectedNode(node: string | PanelSelectedNode | null): void;

    /**
     * Get an observable of the visibility state of the feedback button in the side nav.
     */
    getIsFeedbackBtnVisible$: () => Observable<boolean>;

    /**
     * Set the visibility state of the feedback button in the side nav.
     * @param isVisible The visibility state of the feedback button in the side nav.
     */
    setIsFeedbackBtnVisible: (isVisible: boolean) => void;
  };

  /**
   * Get the id of the currently active project navigation or `null` otherwise.
   */
  getActiveSolutionNavId$(): Observable<string | null>;
}
