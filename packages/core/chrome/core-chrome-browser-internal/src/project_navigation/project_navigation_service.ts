/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { InternalApplicationStart } from '@kbn/core-application-browser-internal';
import {
  ChromeNavLinks,
  ChromeProjectNavigation,
  SideNavComponent,
  ChromeProjectBreadcrumb,
  ChromeSetProjectBreadcrumbsParams,
} from '@kbn/core-chrome-browser';
import { BehaviorSubject, Observable, combineLatest, map } from 'rxjs';
import { createHomeBreadcrumb } from './home_breadcrumbs';

interface StartDeps {
  application: InternalApplicationStart;
  navLinks: ChromeNavLinks;
}

export class ProjectNavigationService {
  private customProjectSideNavComponent$ = new BehaviorSubject<{
    current: SideNavComponent | null;
  }>({ current: null });
  private projectNavigation$ = new BehaviorSubject<ChromeProjectNavigation | undefined>(undefined);

  private projectBreadcrumbs$ = new BehaviorSubject<{
    breadcrumbs: ChromeProjectBreadcrumb[];
    params: ChromeSetProjectBreadcrumbsParams;
  }>({ breadcrumbs: [], params: { absolute: false } });

  public start({ application, navLinks }: StartDeps) {
    // TODO: use application, navLink and projectNavigation$ to:
    // 1. validate projectNavigation$ against navLinks,
    // 2. filter disabled/missing links from projectNavigation
    // 3. keep track of currently active link / path (path will be used to highlight the link in the sidenav and display part of the breadcrumbs)

    return {
      setProjectNavigation: (projectNavigation: ChromeProjectNavigation) => {
        this.projectNavigation$.next(projectNavigation);
      },
      getProjectNavigation$: () => {
        return this.projectNavigation$.asObservable();
      },
      setProjectSideNavComponent: (component: SideNavComponent | null) => {
        this.customProjectSideNavComponent$.next({ current: component });
      },
      getProjectSideNavComponent$: () => {
        return this.customProjectSideNavComponent$.asObservable();
      },
      setProjectBreadcrumbs: (
        breadcrumbs: ChromeProjectBreadcrumb | ChromeProjectBreadcrumb[],
        params?: Partial<ChromeSetProjectBreadcrumbsParams>
      ) => {
        this.projectBreadcrumbs$.next({
          breadcrumbs: Array.isArray(breadcrumbs) ? breadcrumbs : [breadcrumbs],
          params: { absolute: false, ...params },
        });
      },
      getProjectBreadcrumbs$: (): Observable<ChromeProjectBreadcrumb[]> => {
        return combineLatest([this.projectBreadcrumbs$, this.projectNavigation$]).pipe(
          map(([breadcrumbs, projectNavigation]) => {
            /* TODO: point home breadcrumb to the correct place */
            const homeBreadcrumb = createHomeBreadcrumb({ homeHref: '/' });

            if (breadcrumbs.params.absolute) {
              return [homeBreadcrumb, ...breadcrumbs.breadcrumbs];
            } else {
              return [
                homeBreadcrumb,
                /* TODO: insert nav breadcrumbs based on projectNavigation and application path */
                ...breadcrumbs.breadcrumbs,
              ];
            }
          })
        );
      },
    };
  }
}
