/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import React, { MouseEventHandler } from 'react';
import { BehaviorSubject, Observable, ReplaySubject } from 'rxjs';
import { map, takeUntil } from 'rxjs/operators';
import * as Url from 'url';

import { i18n } from '@kbn/i18n';
import { IconType } from '@elastic/eui';

import { InjectedMetadataStart } from '../injected_metadata';
import { NotificationsStart } from '../notifications';
import { InternalApplicationStart } from '../application';
import { HttpStart } from '../http';

import { ChromeNavLinks, NavLinksService } from './nav_links';
import { ChromeRecentlyAccessed, RecentlyAccessedService } from './recently_accessed';
import { NavControlsService, ChromeNavControls } from './nav_controls';
import { LoadingIndicator, HeaderWrapper as Header } from './ui';
import { DocLinksStart } from '../doc_links';

export { ChromeNavControls, ChromeRecentlyAccessed };

const IS_COLLAPSED_KEY = 'core.chrome.isCollapsed';

function isEmbedParamInHash() {
  const { query } = Url.parse(String(window.location.hash).slice(1), true);
  return Boolean(query.embed);
}

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
export interface ChromeBreadcrumb {
  text: string;
  href?: string;
  'data-test-subj'?: string;
  onClick?: MouseEventHandler<HTMLButtonElement>;
}

/** @public */
export type ChromeHelpExtension = (element: HTMLDivElement) => () => void;

interface ConstructorParams {
  browserSupportsCsp: boolean;
}

interface StartDeps {
  application: InternalApplicationStart;
  docLinks: DocLinksStart;
  http: HttpStart;
  injectedMetadata: InjectedMetadataStart;
  notifications: NotificationsStart;
}

/** @internal */
export class ChromeService {
  private readonly stop$ = new ReplaySubject(1);
  private readonly navControls = new NavControlsService();
  private readonly navLinks = new NavLinksService();
  private readonly recentlyAccessed = new RecentlyAccessedService();

  constructor(private readonly params: ConstructorParams) {}

  public async start({
    application,
    docLinks,
    http,
    injectedMetadata,
    notifications,
  }: StartDeps): Promise<InternalChromeStart> {
    const FORCE_HIDDEN = isEmbedParamInHash();

    const appTitle$ = new BehaviorSubject<string>('Kibana');
    const brand$ = new BehaviorSubject<ChromeBrand>({});
    const isVisible$ = new BehaviorSubject(true);
    const isCollapsed$ = new BehaviorSubject(!!localStorage.getItem(IS_COLLAPSED_KEY));
    const applicationClasses$ = new BehaviorSubject<Set<string>>(new Set());
    const helpExtension$ = new BehaviorSubject<ChromeHelpExtension | undefined>(undefined);
    const breadcrumbs$ = new BehaviorSubject<ChromeBreadcrumb[]>([]);
    const badge$ = new BehaviorSubject<ChromeBadge | undefined>(undefined);

    const navControls = this.navControls.start();
    const navLinks = this.navLinks.start({ application, http });
    const recentlyAccessed = await this.recentlyAccessed.start({ http });

    if (!this.params.browserSupportsCsp && injectedMetadata.getCspConfig().warnLegacyBrowsers) {
      notifications.toasts.addWarning(
        i18n.translate('core.chrome.legacyBrowserWarning', {
          defaultMessage: 'Your browser does not meet the security requirements for Kibana.',
        })
      );
    }

    return {
      navControls,
      navLinks,
      recentlyAccessed,

      getHeaderComponent: () => (
        <React.Fragment>
          <LoadingIndicator loadingCount$={http.getLoadingCount$()} />

          <Header
            application={application}
            appTitle$={appTitle$.pipe(takeUntil(this.stop$))}
            badge$={badge$.pipe(takeUntil(this.stop$))}
            basePath={http.basePath}
            breadcrumbs$={breadcrumbs$.pipe(takeUntil(this.stop$))}
            kibanaDocLink={docLinks.links.kibana}
            forceAppSwitcherNavigation$={navLinks.getForceAppSwitcherNavigation$()}
            helpExtension$={helpExtension$.pipe(takeUntil(this.stop$))}
            homeHref={http.basePath.prepend('/app/kibana#/home')}
            isVisible$={isVisible$.pipe(
              map(visibility => (FORCE_HIDDEN ? false : visibility)),
              takeUntil(this.stop$)
            )}
            kibanaVersion={injectedMetadata.getKibanaVersion()}
            legacyMode={injectedMetadata.getLegacyMode()}
            navLinks$={navLinks.getNavLinks$()}
            recentlyAccessed$={recentlyAccessed.get$()}
            navControlsLeft$={navControls.getLeft$()}
            navControlsRight$={navControls.getRight$()}
          />
        </React.Fragment>
      ),

      setAppTitle: (appTitle: string) => appTitle$.next(appTitle),

      getBrand$: () => brand$.pipe(takeUntil(this.stop$)),

      setBrand: (brand: ChromeBrand) => {
        brand$.next(
          Object.freeze({
            logo: brand.logo,
            smallLogo: brand.smallLogo,
          })
        );
      },

      getIsVisible$: () =>
        isVisible$.pipe(
          map(visibility => (FORCE_HIDDEN ? false : visibility)),
          takeUntil(this.stop$)
        ),

      setIsVisible: (visibility: boolean) => {
        isVisible$.next(visibility);
      },

      getIsCollapsed$: () => isCollapsed$.pipe(takeUntil(this.stop$)),

      setIsCollapsed: (isCollapsed: boolean) => {
        isCollapsed$.next(isCollapsed);
        if (isCollapsed) {
          localStorage.setItem(IS_COLLAPSED_KEY, 'true');
        } else {
          localStorage.removeItem(IS_COLLAPSED_KEY);
        }
      },

      getApplicationClasses$: () =>
        applicationClasses$.pipe(
          map(set => [...set]),
          takeUntil(this.stop$)
        ),

      addApplicationClass: (className: string) => {
        const update = new Set([...applicationClasses$.getValue()]);
        update.add(className);
        applicationClasses$.next(update);
      },

      removeApplicationClass: (className: string) => {
        const update = new Set([...applicationClasses$.getValue()]);
        update.delete(className);
        applicationClasses$.next(update);
      },

      getBadge$: () => badge$.pipe(takeUntil(this.stop$)),

      setBadge: (badge: ChromeBadge) => {
        badge$.next(badge);
      },

      getBreadcrumbs$: () => breadcrumbs$.pipe(takeUntil(this.stop$)),

      setBreadcrumbs: (newBreadcrumbs: ChromeBreadcrumb[]) => {
        breadcrumbs$.next(newBreadcrumbs);
      },

      getHelpExtension$: () => helpExtension$.pipe(takeUntil(this.stop$)),

      setHelpExtension: (helpExtension?: ChromeHelpExtension) => {
        helpExtension$.next(helpExtension);
      },
    };
  }

  public stop() {
    this.navLinks.stop();
    this.stop$.next();
  }
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
   * Get an observable of the current collapsed state of the chrome.
   */
  getIsCollapsed$(): Observable<boolean>;

  /**
   * Set the collapsed state of the chrome navigation.
   */
  setIsCollapsed(isCollapsed: boolean): void;

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
   * Get an observable of the current custom help conttent
   */
  getHelpExtension$(): Observable<ChromeHelpExtension | undefined>;

  /**
   * Override the current set of custom help content
   */
  setHelpExtension(helpExtension?: ChromeHelpExtension): void;
}

/** @internal */
export interface InternalChromeStart extends ChromeStart {
  /**
   * Used only by MountingService to render the header UI
   * @internal
   */
  getHeaderComponent(): JSX.Element;
}
