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

import { Breadcrumb as EuiBreadcrumb, IconType } from '@elastic/eui';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { BehaviorSubject, combineLatest, merge, Observable, of, ReplaySubject } from 'rxjs';
import { flatMap, map, takeUntil } from 'rxjs/operators';
import { parse } from 'url';
import { EuiLink } from '@elastic/eui';
import { mountReactNode } from '../utils/mount';
import { InternalApplicationStart } from '../application';
import { DocLinksStart } from '../doc_links';
import { HttpStart } from '../http';
import { InjectedMetadataStart } from '../injected_metadata';
import { NotificationsStart } from '../notifications';
import { IUiSettingsClient } from '../ui_settings';
import { KIBANA_ASK_ELASTIC_LINK } from './constants';
import { ChromeDocTitle, DocTitleService } from './doc_title';
import { ChromeNavControls, NavControlsService } from './nav_controls';
import { ChromeNavLinks, NavLinksService, ChromeNavLink } from './nav_links';
import { ChromeRecentlyAccessed, RecentlyAccessedService } from './recently_accessed';
import { Header } from './ui';
import { NavType } from './ui/header';
import { ChromeHelpExtensionMenuLink } from './ui/header/header_help_menu';
export { ChromeNavControls, ChromeRecentlyAccessed, ChromeDocTitle };

const IS_LOCKED_KEY = 'core.chrome.isLocked';

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

interface ConstructorParams {
  browserSupportsCsp: boolean;
}

interface StartDeps {
  application: InternalApplicationStart;
  docLinks: DocLinksStart;
  http: HttpStart;
  injectedMetadata: InjectedMetadataStart;
  notifications: NotificationsStart;
  uiSettings: IUiSettingsClient;
}

/** @internal */
export class ChromeService {
  private isVisible$!: Observable<boolean>;
  private isForceHidden$!: BehaviorSubject<boolean>;
  private readonly stop$ = new ReplaySubject(1);
  private readonly navControls = new NavControlsService();
  private readonly navLinks = new NavLinksService();
  private readonly recentlyAccessed = new RecentlyAccessedService();
  private readonly docTitle = new DocTitleService();

  constructor(private readonly params: ConstructorParams) {}

  /**
   * These observables allow consumers to toggle the chrome visibility via either:
   *   1. Using setIsVisible() to trigger the next chromeHidden$
   *   2. Setting `chromeless` when registering an application, which will
   *      reset the visibility whenever the next application is mounted
   *   3. Having "embed" in the query string
   */
  private initVisibility(application: StartDeps['application']) {
    // Start off the chrome service hidden if "embed" is in the hash query string.
    const isEmbedded = 'embed' in parse(location.hash.slice(1), true).query;
    this.isForceHidden$ = new BehaviorSubject(isEmbedded);

    const appHidden$ = merge(
      // For the isVisible$ logic, having no mounted app is equivalent to having a hidden app
      // in the sense that the chrome UI should not be displayed until a non-chromeless app is mounting or mounted
      of(true),
      application.currentAppId$.pipe(
        flatMap((appId) =>
          application.applications$.pipe(
            map((applications) => {
              return !!appId && applications.has(appId) && !!applications.get(appId)!.chromeless;
            })
          )
        )
      )
    );
    this.isVisible$ = combineLatest([appHidden$, this.isForceHidden$]).pipe(
      map(([appHidden, forceHidden]) => !appHidden && !forceHidden),
      takeUntil(this.stop$)
    );
  }

  public async start({
    application,
    docLinks,
    http,
    injectedMetadata,
    notifications,
    uiSettings,
  }: StartDeps): Promise<InternalChromeStart> {
    this.initVisibility(application);

    const appTitle$ = new BehaviorSubject<string>('Kibana');
    const brand$ = new BehaviorSubject<ChromeBrand>({});
    const applicationClasses$ = new BehaviorSubject<Set<string>>(new Set());
    const helpExtension$ = new BehaviorSubject<ChromeHelpExtension | undefined>(undefined);
    const breadcrumbs$ = new BehaviorSubject<ChromeBreadcrumb[]>([]);
    const badge$ = new BehaviorSubject<ChromeBadge | undefined>(undefined);
    const customNavLink$ = new BehaviorSubject<ChromeNavLink | undefined>(undefined);
    const helpSupportUrl$ = new BehaviorSubject<string>(KIBANA_ASK_ELASTIC_LINK);
    const isNavDrawerLocked$ = new BehaviorSubject(localStorage.getItem(IS_LOCKED_KEY) === 'true');

    const navControls = this.navControls.start();
    const navLinks = this.navLinks.start({ application, http });
    const recentlyAccessed = await this.recentlyAccessed.start({ http });
    const docTitle = this.docTitle.start({ document: window.document });

    const setIsNavDrawerLocked = (isLocked: boolean) => {
      isNavDrawerLocked$.next(isLocked);
      localStorage.setItem(IS_LOCKED_KEY, `${isLocked}`);
    };

    const getIsNavDrawerLocked$ = isNavDrawerLocked$.pipe(takeUntil(this.stop$));

    // TODO #64541
    // Can delete
    const getNavType$ = uiSettings.get$('pageNavigation').pipe(takeUntil(this.stop$));

    const isIE = () => {
      const ua = window.navigator.userAgent;
      const msie = ua.indexOf('MSIE '); // IE 10 or older
      const trident = ua.indexOf('Trident/'); // IE 11

      return msie > 0 || trident > 0;
    };

    if (!this.params.browserSupportsCsp && injectedMetadata.getCspConfig().warnLegacyBrowsers) {
      notifications.toasts.addWarning({
        title: mountReactNode(
          <FormattedMessage
            id="core.chrome.legacyBrowserWarning"
            defaultMessage="Your browser does not meet the security requirements for Kibana."
          />
        ),
      });
    }

    if (isIE()) {
      notifications.toasts.addWarning({
        title: mountReactNode(
          <FormattedMessage
            id="core.chrome.browserDeprecationWarning"
            defaultMessage="Support for Internet Explorer will be dropped in future versions of this software, please check {link}."
            values={{
              link: (
                <EuiLink target="_blank" href="https://www.elastic.co/support/matrix" external>
                  <FormattedMessage
                    id="core.chrome.browserDeprecationLink"
                    defaultMessage="the support matrix on our website"
                  />
                </EuiLink>
              ),
            }}
          />
        ),
      });
    }

    return {
      navControls,
      navLinks,
      recentlyAccessed,
      docTitle,

      getHeaderComponent: () => (
        <Header
          loadingCount$={http.getLoadingCount$()}
          application={application}
          appTitle$={appTitle$.pipe(takeUntil(this.stop$))}
          badge$={badge$.pipe(takeUntil(this.stop$))}
          basePath={http.basePath}
          breadcrumbs$={breadcrumbs$.pipe(takeUntil(this.stop$))}
          customNavLink$={customNavLink$.pipe(takeUntil(this.stop$))}
          kibanaDocLink={docLinks.links.kibana}
          forceAppSwitcherNavigation$={navLinks.getForceAppSwitcherNavigation$()}
          helpExtension$={helpExtension$.pipe(takeUntil(this.stop$))}
          helpSupportUrl$={helpSupportUrl$.pipe(takeUntil(this.stop$))}
          homeHref={http.basePath.prepend('/app/home')}
          isVisible$={this.isVisible$}
          kibanaVersion={injectedMetadata.getKibanaVersion()}
          legacyMode={injectedMetadata.getLegacyMode()}
          navLinks$={navLinks.getNavLinks$()}
          recentlyAccessed$={recentlyAccessed.get$()}
          navControlsLeft$={navControls.getLeft$()}
          navControlsRight$={navControls.getRight$()}
          onIsLockedUpdate={setIsNavDrawerLocked}
          isLocked$={getIsNavDrawerLocked$}
          navType$={getNavType$}
        />
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

      getIsVisible$: () => this.isVisible$,

      setIsVisible: (isVisible: boolean) => this.isForceHidden$.next(!isVisible),

      getApplicationClasses$: () =>
        applicationClasses$.pipe(
          map((set) => [...set]),
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

      setHelpSupportUrl: (url: string) => helpSupportUrl$.next(url),

      getIsNavDrawerLocked$: () => getIsNavDrawerLocked$,

      getNavType$: () => getNavType$,

      getCustomNavLink$: () => customNavLink$.pipe(takeUntil(this.stop$)),

      setCustomNavLink: (customNavLink?: ChromeNavLink) => {
        customNavLink$.next(customNavLink);
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
   * Get the navigation type
   * TODO #64541
   * Can delete
   */
  getNavType$(): Observable<NavType>;
}

/** @internal */
export interface InternalChromeStart extends ChromeStart {
  /**
   * Used only by MountingService to render the header UI
   * @internal
   */
  getHeaderComponent(): JSX.Element;
}
