/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { sortBy } from 'lodash';
import { BehaviorSubject, ReplaySubject } from 'rxjs';
import { map, takeUntil } from 'rxjs/operators';
import type { HttpStart, IBasePath } from '@kbn/core-http-browser';
import type { PublicAppDeepLinkInfo, PublicAppInfo } from '@kbn/core-application-browser';
import type { InternalApplicationStart } from '@kbn/core-application-browser-internal';
import type { ChromeNavLinks } from '@kbn/core-chrome-browser';
import type { NavLinkWrapper } from './nav_link';
import { toNavLink } from './to_nav_link';

interface StartDeps {
  application: InternalApplicationStart;
  http: HttpStart;
}

export class NavLinksService {
  private readonly stop$ = new ReplaySubject<void>(1);

  public start({ application, http }: StartDeps): ChromeNavLinks {
    const navLinks$ = new BehaviorSubject<ReadonlyMap<string, NavLinkWrapper>>(new Map());
    application.applications$
      .pipe(
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
  basePath: IBasePath
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
