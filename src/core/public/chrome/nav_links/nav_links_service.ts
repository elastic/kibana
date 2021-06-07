/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { sortBy } from 'lodash';
import { BehaviorSubject, combineLatest, Observable, ReplaySubject } from 'rxjs';
import { map, takeUntil } from 'rxjs/operators';

import { InternalApplicationStart, PublicAppDeepLinkInfo, PublicAppInfo } from '../../application';
import { HttpStart } from '../../http';
import { ChromeNavLink, NavLinkWrapper } from './nav_link';
import { toNavLink } from './to_nav_link';

interface StartDeps {
  application: InternalApplicationStart;
  http: HttpStart;
}

/**
 * {@link ChromeNavLinks | APIs} for manipulating nav links.
 *
 * @public
 */
export interface ChromeNavLinks {
  /**
   * Get an observable for a sorted list of navlinks.
   */
  getNavLinks$(): Observable<Array<Readonly<ChromeNavLink>>>;

  /**
   * Get the state of a navlink at this point in time.
   * @param id
   */
  get(id: string): ChromeNavLink | undefined;

  /**
   * Get the current state of all navlinks.
   */
  getAll(): Array<Readonly<ChromeNavLink>>;

  /**
   * Check whether or not a navlink exists.
   * @param id
   */
  has(id: string): boolean;

  /**
   * Remove all navlinks except the one matching the given id.
   *
   * @remarks
   * NOTE: this is not reversible.
   *
   * @param id
   */
  showOnly(id: string): void;

  /**
   * Enable forced navigation mode, which will trigger a page refresh
   * when a nav link is clicked and only the hash is updated.
   *
   * @remarks
   * This is only necessary when rendering the status page in place of another
   * app, as links to that app will set the current URL and change the hash, but
   * the routes for the correct are not loaded so nothing will happen.
   * https://github.com/elastic/kibana/pull/29770
   *
   * Used only by status_page plugin
   */
  enableForcedAppSwitcherNavigation(): void;

  /**
   * An observable of the forced app switcher state.
   */
  getForceAppSwitcherNavigation$(): Observable<boolean>;
}

type LinksUpdater = (navLinks: Map<string, NavLinkWrapper>) => Map<string, NavLinkWrapper>;

export class NavLinksService {
  private readonly stop$ = new ReplaySubject(1);

  public start({ application, http }: StartDeps): ChromeNavLinks {
    const appLinks$ = application.applications$.pipe(
      map((apps) => {
        return new Map(
          [...apps]
            .filter(([, app]) => !app.chromeless)
            .reduce((navLinks: Array<[string, NavLinkWrapper]>, [appId, app]) => {
              navLinks.push(
                [appId, toNavLink(app, http.basePath)],
                ...toNavDeepLinks(app, app.deepLinks, http.basePath)
              );
              return navLinks;
            }, [])
        );
      })
    );

    // now that availableApps$ is an observable, we need to keep record of all
    // manual link modifications to be able to re-apply then after every
    // availableApps$ changes.
    // Only in use by `showOnly` API, can be removed once dashboard_mode is removed in 8.0
    const linkUpdaters$ = new BehaviorSubject<LinksUpdater[]>([]);
    const navLinks$ = new BehaviorSubject<ReadonlyMap<string, NavLinkWrapper>>(new Map());

    combineLatest([appLinks$, linkUpdaters$])
      .pipe(
        map(([appLinks, linkUpdaters]) => {
          return linkUpdaters.reduce((links, updater) => updater(links), appLinks);
        })
      )
      .subscribe((navlinks) => {
        navLinks$.next(navlinks);
      });

    const forceAppSwitcherNavigation$ = new BehaviorSubject(false);

    return {
      getNavLinks$: () => {
        return navLinks$.pipe(map(sortNavLinks), takeUntil(this.stop$));
      },

      get(id: string) {
        const link = navLinks$.value.get(id);
        return link && link.properties;
      },

      getAll() {
        return sortNavLinks(navLinks$.value);
      },

      has(id: string) {
        return navLinks$.value.has(id);
      },

      showOnly(id: string) {
        if (!this.has(id)) {
          return;
        }

        const updater: LinksUpdater = (navLinks) =>
          new Map([...navLinks.entries()].filter(([linkId]) => linkId === id));

        linkUpdaters$.next([...linkUpdaters$.value, updater]);
      },

      enableForcedAppSwitcherNavigation() {
        forceAppSwitcherNavigation$.next(true);
      },

      getForceAppSwitcherNavigation$() {
        return forceAppSwitcherNavigation$.asObservable();
      },
    };
  }

  public stop() {
    this.stop$.next();
  }
}

function sortNavLinks(navLinks: ReadonlyMap<string, NavLinkWrapper>) {
  return sortBy(
    [...navLinks.values()].map((link) => link.properties),
    'order'
  );
}

function toNavDeepLinks(
  app: PublicAppInfo,
  deepLinks: PublicAppDeepLinkInfo[],
  basePath: HttpStart['basePath']
): Array<[string, NavLinkWrapper]> {
  if (!deepLinks) {
    return [];
  }
  return deepLinks.reduce((navDeepLinks: Array<[string, NavLinkWrapper]>, deepLink) => {
    const id = `${app.id}:${deepLink.id}`;
    if (deepLink.path) {
      navDeepLinks.push([id, toNavLink(app, basePath, { ...deepLink, id })]);
    }
    navDeepLinks.push(...toNavDeepLinks(app, deepLink.deepLinks, basePath));
    return navDeepLinks;
  }, []);
}
