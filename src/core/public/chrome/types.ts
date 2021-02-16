/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiBreadcrumb, IconType } from '@elastic/eui';
import { Observable } from 'rxjs';
import { MountPoint } from '../types';
import { ChromeDocTitle } from './doc_title';
import { ChromeNavControls } from './nav_controls';
import { ChromeNavLinks, ChromeNavLink } from './nav_links';
import { ChromeRecentlyAccessed } from './recently_accessed';
import { ChromeHelpExtensionMenuLink } from './ui/header/header_help_menu';

/** @public */
export interface ChromeBadge {
  text: string;
  tooltip: string;
  iconType?: IconType;
}

/** @public */
export interface ChromeBrand {
  logo?: string;
  smallLogo?: string;
}

/** @public */
export type ChromeBreadcrumb = EuiBreadcrumb;

/** @public */
export interface ChromeBreadcrumbsAppendExtension {
  content: MountPoint<HTMLDivElement>;
}

/** @public */
export interface ChromeUserBanner {
  content: MountPoint<HTMLDivElement>;
}

/** @public */
export interface ChromeHelpExtension {
  /**
   * Provide your plugin's name to create a header for separation
   */
  appName: string;
  /**
   * Creates unified links for sending users to documentation, GitHub, Discuss, or a custom link/button
   */
  links?: ChromeHelpExtensionMenuLink[];
  /**
   * Custom content to occur below the list of links
   */
  content?: (element: HTMLDivElement) => () => void;
}

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
   * Sets the current app's title
   *
   * @internalRemarks
   * This should be handled by the application service once it is in charge
   * of mounting applications.
   */
  setAppTitle(appTitle: string): void;

  /**
   * Get an observable of the current brand information.
   */
  getBrand$(): Observable<ChromeBrand>;

  /**
   * Set the brand configuration.
   *
   * @remarks
   * Normally the `logo` property will be rendered as the
   * CSS background for the home link in the chrome navigation, but when the page is
   * rendered in a small window the `smallLogo` will be used and rendered at about
   * 45px wide.
   *
   * @example
   * ```js
   * chrome.setBrand({
   *   logo: 'url(/plugins/app/logo.png) center no-repeat'
   *   smallLogo: 'url(/plugins/app/logo-small.png) center no-repeat'
   * })
   * ```
   *
   */
  setBrand(brand: ChromeBrand): void;

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
   * Get the current set of classNames that will be set on the application container.
   */
  getApplicationClasses$(): Observable<string[]>;

  /**
   * Add a className that should be set on the application container.
   */
  addApplicationClass(className: string): void;

  /**
   * Remove a className added with `addApplicationClass()`. If className is unknown it is ignored.
   */
  removeApplicationClass(className: string): void;

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
  setBreadcrumbs(newBreadcrumbs: ChromeBreadcrumb[]): void;

  /**
   * Get an observable of the current extension appended to breadcrumbs
   */
  getBreadcrumbsAppendExtension$(): Observable<ChromeBreadcrumbsAppendExtension | undefined>;

  /**
   * Mount an element next to the last breadcrumb
   */
  setBreadcrumbsAppendExtension(
    breadcrumbsAppendExtension?: ChromeBreadcrumbsAppendExtension
  ): void;

  /**
   * Get an observable of the current custom nav link
   */
  getCustomNavLink$(): Observable<Partial<ChromeNavLink> | undefined>;

  /**
   * Override the current set of custom nav link
   */
  setCustomNavLink(newCustomNavLink?: Partial<ChromeNavLink>): void;

  /**
   * Get an observable of the current custom help conttent
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
   * Get an observable of the current locked state of the nav drawer.
   */
  getIsNavDrawerLocked$(): Observable<boolean>;

  /**
   * Set the banner that will appear on top of the chrome header.
   *
   * @remarks Using `undefined` when invoking this API will remove the banner.
   */
  setHeaderBanner(headerBanner?: ChromeUserBanner): void;
}

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
}
