/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { InternalApplicationStart } from '@kbn/core-application-browser-internal';
import type {
  ChromeNavLinks,
  SideNavComponent,
  ChromeProjectBreadcrumb,
  ChromeBreadcrumb,
  ChromeSetProjectBreadcrumbsParams,
  ChromeProjectNavigationNode,
  NavigationTreeDefinition,
} from '@kbn/core-chrome-browser';
import type { InternalHttpStart } from '@kbn/core-http-browser-internal';
import {
  BehaviorSubject,
  Observable,
  combineLatest,
  map,
  takeUntil,
  ReplaySubject,
  skip,
  distinctUntilChanged,
  skipWhile,
  filter,
} from 'rxjs';
import type { Location } from 'history';
import deepEqual from 'react-fast-compare';

import {
  AppDeepLinkId,
  ChromeNavLink,
  CloudURLs,
  NavigationTreeDefinitionUI,
} from '@kbn/core-chrome-browser/src';
import type { Logger } from '@kbn/logging';

import { findActiveNodes, flattenNav, parseNavigationTree, stripQueryParams } from './utils';
import { buildBreadcrumbs } from './breadcrumbs';
import { getCloudLinks } from './cloud_links';

interface StartDeps {
  application: InternalApplicationStart;
  navLinksService: ChromeNavLinks;
  http: InternalHttpStart;
  chromeBreadcrumbs$: Observable<ChromeBreadcrumb[]>;
  logger: Logger;
}

export class ProjectNavigationService {
  private logger: Logger | undefined;
  private customProjectSideNavComponent$ = new BehaviorSubject<{
    current: SideNavComponent | null;
  }>({ current: null });
  private projectHome$ = new BehaviorSubject<string | undefined>(undefined);
  private projectsUrl$ = new BehaviorSubject<string | undefined>(undefined);
  private projectName$ = new BehaviorSubject<string | undefined>(undefined);
  private projectUrl$ = new BehaviorSubject<string | undefined>(undefined);
  private navigationTree$ = new BehaviorSubject<ChromeProjectNavigationNode[] | undefined>(
    undefined
  );
  // The flattened version of the navigation tree for quicker access
  private projectNavigationNavTreeFlattened: Record<string, ChromeProjectNavigationNode> = {};
  // The navigation tree for the Side nav UI that still contains layout information (body, footer, etc.)
  private navigationTreeUi$ = new BehaviorSubject<NavigationTreeDefinitionUI | null>(null);
  private activeNodes$ = new BehaviorSubject<ChromeProjectNavigationNode[][]>([]);

  private projectBreadcrumbs$ = new BehaviorSubject<{
    breadcrumbs: ChromeProjectBreadcrumb[];
    params: ChromeSetProjectBreadcrumbsParams;
  }>({ breadcrumbs: [], params: { absolute: false } });
  private readonly stop$ = new ReplaySubject<void>(1);
  private application?: InternalApplicationStart;
  private http?: InternalHttpStart;
  private unlistenHistory?: () => void;

  public start({ application, navLinksService, http, chromeBreadcrumbs$, logger }: StartDeps) {
    this.application = application;
    this.http = http;
    this.logger = logger;
    this.onHistoryLocationChange(application.history.location);
    this.unlistenHistory = application.history.listen(this.onHistoryLocationChange.bind(this));

    this.activeNodes$
      .pipe(
        takeUntil(this.stop$),
        // skip while the project navigation is not set
        skipWhile(() => !this.navigationTree$.getValue()),
        // only reset when the active breadcrumb path changes, use ids to get more stable reference
        distinctUntilChanged((prevNodes, nextNodes) =>
          deepEqual(
            prevNodes?.[0]?.map((node) => node.id),
            nextNodes?.[0]?.map((node) => node.id)
          )
        ),
        // skip the initial state, we only want to reset the breadcrumbs when the active nodes change
        skip(1)
      )
      .subscribe(() => {
        // reset the breadcrumbs when the active nodes change
        this.projectBreadcrumbs$.next({ breadcrumbs: [], params: { absolute: false } });
      });

    return {
      setProjectHome: (homeHref: string) => {
        this.projectHome$.next(homeHref);
      },
      getProjectHome$: () => {
        return this.projectHome$.asObservable();
      },
      setProjectsUrl: (projectsUrl: string) => {
        this.projectsUrl$.next(projectsUrl);
      },
      getProjectsUrl$: () => {
        return this.projectsUrl$.asObservable();
      },
      setProjectName: (projectName: string) => {
        this.projectName$.next(projectName);
      },
      getProjectName$: () => {
        return this.projectName$.asObservable();
      },
      setProjectUrl: (projectUrl: string) => {
        this.projectUrl$.next(projectUrl);
      },
      initNavigation: <LinkId extends AppDeepLinkId = AppDeepLinkId>(
        navTreeDefinition: Observable<NavigationTreeDefinition<LinkId>>,
        { cloudUrls }: { cloudUrls: CloudURLs }
      ) => {
        this.initNavigation(navTreeDefinition, { navLinksService, cloudUrls });
      },
      getNavigationTreeUi$: this.getNavigationTreeUi$.bind(this),
      getActiveNodes$: () => {
        return this.activeNodes$.pipe(takeUntil(this.stop$));
      },
      setSideNavComponent: (component: SideNavComponent | null) => {
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
        return combineLatest([
          this.projectBreadcrumbs$,
          this.activeNodes$,
          chromeBreadcrumbs$,
          this.projectsUrl$,
          this.projectUrl$,
          this.projectName$,
        ]).pipe(
          map(
            ([
              projectBreadcrumbs,
              activeNodes,
              chromeBreadcrumbs,
              projectsUrl,
              projectUrl,
              projectName,
            ]) => {
              return buildBreadcrumbs({
                projectUrl,
                projectName,
                projectsUrl,
                projectBreadcrumbs,
                activeNodes,
                chromeBreadcrumbs,
              });
            }
          )
        );
      },
    };
  }

  private initNavigation(
    navTreeDefinition: Observable<NavigationTreeDefinition>,
    { navLinksService, cloudUrls }: { navLinksService: ChromeNavLinks; cloudUrls: CloudURLs }
  ) {
    if (this.navigationTree$.getValue() !== undefined) {
      throw new Error('Project navigation has already been initiated.');
    }

    const deepLinksMap$ = navLinksService.getNavLinks$().pipe(
      map((navLinks) => {
        return navLinks.reduce((acc, navLink) => {
          acc[navLink.id] = navLink;
          return acc;
        }, {} as Record<string, ChromeNavLink>);
      })
    );

    const cloudLinks = getCloudLinks(cloudUrls);

    combineLatest([navTreeDefinition.pipe(takeUntil(this.stop$)), deepLinksMap$])
      .pipe(
        map(([def, deepLinksMap]) => {
          return parseNavigationTree(def, {
            deepLinks: deepLinksMap,
            cloudLinks,
          });
        })
      )
      .subscribe({
        next: ({ navigationTree, navigationTreeUI }) => {
          this.navigationTree$.next(navigationTree);
          this.navigationTreeUi$.next(navigationTreeUI);

          this.projectNavigationNavTreeFlattened = flattenNav(navigationTree);
          this.setActiveProjectNavigationNodes();
        },
        error: (err) => {
          this.logger?.error(err);
        },
      });
  }

  private getNavigationTreeUi$(): Observable<NavigationTreeDefinitionUI> {
    return this.navigationTreeUi$
      .asObservable()
      .pipe(filter((v): v is NavigationTreeDefinitionUI => v !== null));
  }

  private setActiveProjectNavigationNodes(_location?: Location) {
    if (!this.application) return;
    if (!Object.keys(this.projectNavigationNavTreeFlattened).length) return;

    const location = _location ?? this.application.history.location;
    let currentPathname = this.http?.basePath.prepend(location.pathname) ?? location.pathname;

    // We add possible hash to the current pathname
    // e.g. /app/kibana#/management
    currentPathname = stripQueryParams(`${currentPathname}${location.hash}`);

    const activeNodes = findActiveNodes(
      currentPathname,
      this.projectNavigationNavTreeFlattened,
      location,
      this.http?.basePath.prepend
    );

    // Each time we call findActiveNodes() we create a new array of activeNodes. As this array is used
    // in React in useCallback() and useMemo() dependencies arrays it triggers an infinite navigation
    // tree registration loop. To avoid that we only notify the listeners when the activeNodes array
    // has actually changed.
    const requiresUpdate = !deepEqual(activeNodes, this.activeNodes$.value);

    if (!requiresUpdate) return;

    this.activeNodes$.next(activeNodes);
  }

  private onHistoryLocationChange(location: Location) {
    this.setActiveProjectNavigationNodes(location);
  }

  public stop() {
    this.stop$.next();
    this.unlistenHistory?.();
  }
}
