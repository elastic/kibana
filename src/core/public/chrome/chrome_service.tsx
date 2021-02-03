/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

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
import { KIBANA_ASK_ELASTIC_LINK } from './constants';
import { ChromeDocTitle, DocTitleService } from './doc_title';
import { ChromeNavControls, NavControlsService } from './nav_controls';
import { NavLinksService, ChromeNavLink } from './nav_links';
import { ChromeRecentlyAccessed, RecentlyAccessedService } from './recently_accessed';
import { Header, Footer } from './ui';
export { ChromeNavControls, ChromeRecentlyAccessed, ChromeDocTitle };
import {
  ChromeBadge,
  ChromeBrand,
  ChromeBreadcrumb,
  ChromeBreadcrumbsAppendExtension,
  ChromeHelpExtension,
  InternalChromeStart,
  ChromeUserBanner,
} from './types';

const IS_LOCKED_KEY = 'core.chrome.isLocked';

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
  }: StartDeps): Promise<InternalChromeStart> {
    this.initVisibility(application);

    const appTitle$ = new BehaviorSubject<string>('Kibana');
    const brand$ = new BehaviorSubject<ChromeBrand>({});
    const applicationClasses$ = new BehaviorSubject<Set<string>>(new Set());
    const helpExtension$ = new BehaviorSubject<ChromeHelpExtension | undefined>(undefined);
    const breadcrumbs$ = new BehaviorSubject<ChromeBreadcrumb[]>([]);
    const breadcrumbsAppendExtension$ = new BehaviorSubject<
      ChromeBreadcrumbsAppendExtension | undefined
    >(undefined);
    const badge$ = new BehaviorSubject<ChromeBadge | undefined>(undefined);
    const customNavLink$ = new BehaviorSubject<ChromeNavLink | undefined>(undefined);
    const helpSupportUrl$ = new BehaviorSubject<string>(KIBANA_ASK_ELASTIC_LINK);
    const isNavDrawerLocked$ = new BehaviorSubject(localStorage.getItem(IS_LOCKED_KEY) === 'true');

    const footerBanner$ = new BehaviorSubject<ChromeUserBanner | undefined>(undefined);
    const headerBanner$ = new BehaviorSubject<ChromeUserBanner | undefined>(undefined);
    const bodyClasses$ = combineLatest([footerBanner$, headerBanner$]).pipe(
      map(([footerBanner, headerBanner]) => {
        const bodyClasses: string[] = [];
        if (footerBanner) {
          bodyClasses.push('kbnBody--hasFooterBanner');
        }
        if (headerBanner) {
          bodyClasses.push('kbnBody--hasHeaderBanner');
        }
        return bodyClasses;
      })
    );

    const navControls = this.navControls.start();
    const navLinks = this.navLinks.start({ application, http });
    const recentlyAccessed = await this.recentlyAccessed.start({ http });
    const docTitle = this.docTitle.start({ document: window.document });

    // erase chrome fields from a previous app while switching to a next app
    application.currentAppId$.subscribe(() => {
      helpExtension$.next(undefined);
      breadcrumbs$.next([]);
      badge$.next(undefined);
      docTitle.reset();
    });

    const setIsNavDrawerLocked = (isLocked: boolean) => {
      isNavDrawerLocked$.next(isLocked);
      localStorage.setItem(IS_LOCKED_KEY, `${isLocked}`);
    };

    const getIsNavDrawerLocked$ = isNavDrawerLocked$.pipe(takeUntil(this.stop$));

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
          breadcrumbsAppendExtension$={breadcrumbsAppendExtension$.pipe(takeUntil(this.stop$))}
          customNavLink$={customNavLink$.pipe(takeUntil(this.stop$))}
          kibanaDocLink={docLinks.links.kibana}
          forceAppSwitcherNavigation$={navLinks.getForceAppSwitcherNavigation$()}
          helpExtension$={helpExtension$.pipe(takeUntil(this.stop$))}
          helpSupportUrl$={helpSupportUrl$.pipe(takeUntil(this.stop$))}
          homeHref={http.basePath.prepend('/app/home')}
          isVisible$={this.isVisible$}
          kibanaVersion={injectedMetadata.getKibanaVersion()}
          navLinks$={navLinks.getNavLinks$()}
          recentlyAccessed$={recentlyAccessed.get$()}
          navControlsLeft$={navControls.getLeft$()}
          navControlsCenter$={navControls.getCenter$()}
          navControlsRight$={navControls.getRight$()}
          onIsLockedUpdate={setIsNavDrawerLocked}
          isLocked$={getIsNavDrawerLocked$}
        />
      ),

      getFooterComponent: () => <Footer footerBanner$={footerBanner$} />,

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

      getBreadcrumbsAppendExtension$: () => breadcrumbsAppendExtension$.pipe(takeUntil(this.stop$)),

      setBreadcrumbsAppendExtension: (
        breadcrumbsAppendExtension?: ChromeBreadcrumbsAppendExtension
      ) => {
        breadcrumbsAppendExtension$.next(breadcrumbsAppendExtension);
      },

      getHelpExtension$: () => helpExtension$.pipe(takeUntil(this.stop$)),

      setHelpExtension: (helpExtension?: ChromeHelpExtension) => {
        helpExtension$.next(helpExtension);
      },

      setHelpSupportUrl: (url: string) => helpSupportUrl$.next(url),

      getIsNavDrawerLocked$: () => getIsNavDrawerLocked$,

      getCustomNavLink$: () => customNavLink$.pipe(takeUntil(this.stop$)),

      setCustomNavLink: (customNavLink?: ChromeNavLink) => {
        customNavLink$.next(customNavLink);
      },

      setFooterBanner: (footerBanner?: ChromeUserBanner) => {
        footerBanner$.next(footerBanner);
      },

      getBodyClasses$: () => bodyClasses$.pipe(takeUntil(this.stop$)),
    };
  }

  public stop() {
    this.navLinks.stop();
    this.stop$.next();
  }
}
