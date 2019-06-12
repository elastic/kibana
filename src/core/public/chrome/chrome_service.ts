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

import * as Url from 'url';

import { i18n } from '@kbn/i18n';
import * as Rx from 'rxjs';
import { map, takeUntil } from 'rxjs/operators';
import { IconType } from '@elastic/eui';
import { InjectedMetadataStart } from '../injected_metadata';
import { NotificationsStart } from '../notifications';
import { NavLinksService } from './nav_links/nav_links_service';
import { ApplicationStart } from '../application';
import { HttpStart } from '../http';

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
}

/** @public */
export type ChromeHelpExtension = (element: HTMLDivElement) => (() => void);

interface ConstructorParams {
  browserSupportsCsp: boolean;
}

interface StartDeps {
  application: ApplicationStart;
  http: HttpStart;
  injectedMetadata: InjectedMetadataStart;
  notifications: NotificationsStart;
}

/** @internal */
export class ChromeService {
  private readonly stop$ = new Rx.ReplaySubject(1);
  private readonly browserSupportsCsp: boolean;
  private readonly navLinks = new NavLinksService();

  public constructor({ browserSupportsCsp }: ConstructorParams) {
    this.browserSupportsCsp = browserSupportsCsp;
  }

  public start({ application, http, injectedMetadata, notifications }: StartDeps) {
    const FORCE_HIDDEN = isEmbedParamInHash();

    const brand$ = new Rx.BehaviorSubject<ChromeBrand>({});
    const isVisible$ = new Rx.BehaviorSubject(true);
    const isCollapsed$ = new Rx.BehaviorSubject(!!localStorage.getItem(IS_COLLAPSED_KEY));
    const applicationClasses$ = new Rx.BehaviorSubject<Set<string>>(new Set());
    const helpExtension$ = new Rx.BehaviorSubject<ChromeHelpExtension | undefined>(undefined);
    const breadcrumbs$ = new Rx.BehaviorSubject<ChromeBreadcrumb[]>([]);
    const badge$ = new Rx.BehaviorSubject<ChromeBadge | undefined>(undefined);

    if (!this.browserSupportsCsp && injectedMetadata.getCspConfig().warnLegacyBrowsers) {
      notifications.toasts.addWarning(
        i18n.translate('core.chrome.legacyBrowserWarning', {
          defaultMessage: 'Your browser does not meet the security requirements for Kibana.',
        })
      );
    }

    return {
      navLinks: this.navLinks.start({ application, http }),

      /**
       * Set the brand configuration. Normally the `logo` property will be rendered as the
       * CSS background for the home link in the chrome navigation, but when the page is
       * rendered in a small window the `smallLogo` will be used and rendered at about
       * 45px wide.
       *
       * example:
       *
       *    chrome.setBrand({
       *      logo: 'url(/plugins/app/logo.png) center no-repeat'
       *      smallLogo: 'url(/plugins/app/logo-small.png) center no-repeat'
       *    })
       *
       */
      setBrand: (brand: ChromeBrand) => {
        brand$.next(
          Object.freeze({
            logo: brand.logo,
            smallLogo: brand.smallLogo,
          })
        );
      },

      /**
       * Get an observable of the current brand information.
       */
      getBrand$: () => brand$.pipe(takeUntil(this.stop$)),

      /**
       * Set the temporary visibility for the chrome. This does nothing if the chrome is hidden
       * by default and should be used to hide the chrome for things like full-screen modes
       * with an exit button.
       */
      setIsVisible: (visibility: boolean) => {
        isVisible$.next(visibility);
      },

      /**
       * Get an observable of the current visibility state of the chrome.
       */
      getIsVisible$: () =>
        isVisible$.pipe(
          map(visibility => (FORCE_HIDDEN ? false : visibility)),
          takeUntil(this.stop$)
        ),

      /**
       * Set the collapsed state of the chrome navigation.
       */
      setIsCollapsed: (isCollapsed: boolean) => {
        isCollapsed$.next(isCollapsed);
        if (isCollapsed) {
          localStorage.setItem(IS_COLLAPSED_KEY, 'true');
        } else {
          localStorage.removeItem(IS_COLLAPSED_KEY);
        }
      },

      /**
       * Get an observable of the current collapsed state of the chrome.
       */
      getIsCollapsed$: () => isCollapsed$.pipe(takeUntil(this.stop$)),

      /**
       * Add a className that should be set on the application container.
       */
      addApplicationClass: (className: string) => {
        const update = new Set([...applicationClasses$.getValue()]);
        update.add(className);
        applicationClasses$.next(update);
      },

      /**
       * Remove a className added with `addApplicationClass()`. If className is unknown it is ignored.
       */
      removeApplicationClass: (className: string) => {
        const update = new Set([...applicationClasses$.getValue()]);
        update.delete(className);
        applicationClasses$.next(update);
      },

      /**
       * Get the current set of classNames that will be set on the application container.
       */
      getApplicationClasses$: () =>
        applicationClasses$.pipe(
          map(set => [...set]),
          takeUntil(this.stop$)
        ),
      /**
       * Get an observable of the current badge
       */
      getBadge$: () => badge$.pipe(takeUntil(this.stop$)),

      /**
       * Override the current badge
       */
      setBadge: (badge: ChromeBadge | undefined) => {
        badge$.next(badge);
      },

      /**
       * Get an observable of the current list of breadcrumbs
       */
      getBreadcrumbs$: () => breadcrumbs$.pipe(takeUntil(this.stop$)),

      /**
       * Override the current set of breadcrumbs
       */
      setBreadcrumbs: (newBreadcrumbs: ChromeBreadcrumb[]) => {
        breadcrumbs$.next(newBreadcrumbs);
      },

      /**
       * Get an observable of the current custom help conttent
       */
      getHelpExtension$: () => helpExtension$.pipe(takeUntil(this.stop$)),

      /**
       * Override the current set of breadcrumbs
       */
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

/** @public */
export type ChromeStart = ReturnType<ChromeService['start']>;
