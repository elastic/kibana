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
  SolutionNavigationDefinitions,
  ChromeStyle,
  CloudLinks,
} from '@kbn/core-chrome-browser';
import type { InternalHttpStart } from '@kbn/core-http-browser-internal';
import {
  BehaviorSubject,
  combineLatest,
  map,
  takeUntil,
  ReplaySubject,
  skip,
  distinctUntilChanged,
  skipWhile,
  filter,
  of,
  type Observable,
  type Subscription,
  take,
  debounceTime,
} from 'rxjs';
import { type Location, createLocation } from 'history';
import deepEqual from 'react-fast-compare';

import {
  AppDeepLinkId,
  ChromeNavLink,
  CloudURLs,
  NavigationTreeDefinitionUI,
} from '@kbn/core-chrome-browser';
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
  setChromeStyle: (style: ChromeStyle) => void;
}

export class ProjectNavigationService {
  private logger: Logger | undefined;
  private customProjectSideNavComponent$ = new BehaviorSubject<{
    current: SideNavComponent | null;
  }>({ current: null });
  private projectHome$ = new BehaviorSubject<string | undefined>(undefined);
  private projectName$ = new BehaviorSubject<string | undefined>(undefined);
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
  private readonly solutionNavDefinitions$ = new BehaviorSubject<SolutionNavigationDefinitions>({});
  private readonly activeSolutionNavDefinitionId$ = new BehaviorSubject<string | null>(null);
  private readonly location$ = new BehaviorSubject<Location>(createLocation('/'));
  private deepLinksMap$: Observable<Record<string, ChromeNavLink>> = of({});
  private cloudLinks$ = new BehaviorSubject<CloudLinks>({});
  private application?: InternalApplicationStart;
  private navLinksService?: ChromeNavLinks;
  private http?: InternalHttpStart;
  private navigationChangeSubscription?: Subscription;
  private unlistenHistory?: () => void;
  private setChromeStyle: StartDeps['setChromeStyle'] = () => {};

  public start({
    application,
    navLinksService,
    http,
    chromeBreadcrumbs$,
    logger,
    setChromeStyle,
  }: StartDeps) {
    this.application = application;
    this.navLinksService = navLinksService;
    this.http = http;
    this.logger = logger;
    this.onHistoryLocationChange(application.history.location);
    this.unlistenHistory = application.history.listen(this.onHistoryLocationChange.bind(this));
    this.setChromeStyle = setChromeStyle;

    this.handleActiveNodesChange();
    this.handleEmptyActiveNodes();

    this.deepLinksMap$ = navLinksService.getNavLinks$().pipe(
      map((navLinks) => {
        return navLinks.reduce((acc, navLink) => {
          acc[navLink.id] = navLink;
          return acc;
        }, {} as Record<string, ChromeNavLink>);
      })
    );

    return {
      setProjectHome: (homeHref: string) => {
        this.projectHome$.next(homeHref);
      },
      getProjectHome$: () => {
        return this.projectHome$.asObservable();
      },
      setCloudUrls: (cloudUrls: CloudURLs) => {
        // Cloud links never change, so we only need to parse them once
        if (Object.keys(this.cloudLinks$.getValue()).length > 0) return;

        this.cloudLinks$.next(getCloudLinks(cloudUrls));
      },
      setProjectName: (projectName: string) => {
        this.projectName$.next(projectName);
      },
      getProjectName$: () => {
        return this.projectName$.asObservable();
      },
      initNavigation: <LinkId extends AppDeepLinkId = AppDeepLinkId>(
        navTreeDefinition: Observable<NavigationTreeDefinition<LinkId>>
      ) => {
        this.initNavigation(navTreeDefinition);
      },
      getNavigationTreeUi$: this.getNavigationTreeUi$.bind(this),
      getActiveNodes$: () => {
        return this.activeNodes$.pipe(takeUntil(this.stop$));
      },
      setSideNavComponent: this.setSideNavComponent.bind(this),
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
          this.projectName$,
          this.solutionNavDefinitions$,
          this.activeSolutionNavDefinitionId$,
          this.cloudLinks$,
        ]).pipe(
          map(
            ([
              projectBreadcrumbs,
              activeNodes,
              chromeBreadcrumbs,
              projectName,
              solutionNavDefinitions,
              activeSolutionNavDefinitionId,
              cloudLinks,
            ]) => {
              const solutionNavigations =
                Object.keys(solutionNavDefinitions).length > 0 &&
                activeSolutionNavDefinitionId !== null
                  ? {
                      definitions: solutionNavDefinitions,
                      activeId: activeSolutionNavDefinitionId,
                      onChange: this.changeActiveSolutionNavigation.bind(this),
                    }
                  : undefined;

              return buildBreadcrumbs({
                projectName,
                projectBreadcrumbs,
                activeNodes,
                chromeBreadcrumbs,
                solutionNavigations,
                cloudLinks,
              });
            }
          )
        );
      },
      /** In stateful Kibana, get the registered solution navigations */
      getSolutionsNavDefinitions$: this.getSolutionsNavDefinitions$.bind(this),
      /** In stateful Kibana, update the registered solution navigations */
      updateSolutionNavigations: this.updateSolutionNavigations.bind(this),
      /** In stateful Kibana, change the active solution navigation */
      changeActiveSolutionNavigation: this.changeActiveSolutionNavigation.bind(this),
      /** In stateful Kibana, get the active solution navigation definition */
      getActiveSolutionNavDefinition$: this.getActiveSolutionNavDefinition$.bind(this),
    };
  }

  /**
   * Initialize a "serverless style" navigation. For stateful deployments (not serverless), this
   * handler initialize one of the solution navigations registered.
   *
   * @param navTreeDefinition$ The navigation tree definition
   * @param location Optional location to use to detect the active node in the new navigation tree
   */
  private initNavigation(
    navTreeDefinition$: Observable<NavigationTreeDefinition>,
    location?: Location
  ) {
    if (this.navigationChangeSubscription) {
      this.navigationChangeSubscription.unsubscribe();
    }

    let redirectLocation = location;
    this.projectNavigationNavTreeFlattened = {};
    this.navigationChangeSubscription = combineLatest([
      navTreeDefinition$,
      this.deepLinksMap$,
      this.cloudLinks$,
    ])
      .pipe(
        takeUntil(this.stop$),
        map(([def, deepLinksMap, cloudLinks]) => {
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
          this.updateActiveProjectNavigationNodes(redirectLocation);
          redirectLocation = undefined; // we don't want to redirect on subsequent changes, only when initiating
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

  private findActiveNodes({
    location: _location,
    flattendTree = this.projectNavigationNavTreeFlattened,
  }: {
    location?: Location;
    flattendTree?: Record<string, ChromeProjectNavigationNode>;
  } = {}): ChromeProjectNavigationNode[][] {
    if (!this.application) return [];
    if (!Object.keys(this.projectNavigationNavTreeFlattened).length) return [];

    const location = _location ?? this.application.history.location;
    let currentPathname = this.http?.basePath.prepend(location.pathname) ?? location.pathname;

    // We add possible hash to the current pathname
    // e.g. /app/kibana#/management
    currentPathname = stripQueryParams(`${currentPathname}${location.hash}`);

    return findActiveNodes(currentPathname, flattendTree, location, this.http?.basePath.prepend);
  }

  /**
   * Find the active nodes in the navigation tree based on the current location (or a location passed in params)
   * and update the activeNodes$ Observable.
   *
   * @param location Optional location to use to detect the active node in the new navigation tree, if not set the current location is used
   */
  private updateActiveProjectNavigationNodes(location?: Location) {
    const activeNodes = this.findActiveNodes({ location });
    // Each time we call findActiveNodes() we create a new array of activeNodes. As this array is used
    // in React in useCallback() and useMemo() dependencies arrays it triggers an infinite navigation
    // tree registration loop. To avoid that we only notify the listeners when the activeNodes array
    // has actually changed.
    const requiresUpdate = !deepEqual(activeNodes, this.activeNodes$.value);

    if (!requiresUpdate) return;

    this.activeNodes$.next(activeNodes);
  }

  private onHistoryLocationChange(location: Location) {
    this.location$.next(location);
    this.updateActiveProjectNavigationNodes(location);
  }

  private handleActiveNodesChange() {
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
  }

  /**
   * When we are in stateful Kibana with multiple solution navigations, it is possible that a user
   * lands on a page that does not belong to the current active solution navigation. In this case,
   * we need to find the correct solution navigation based on the current location and switch to it.
   */
  private handleEmptyActiveNodes() {
    combineLatest([
      this.activeNodes$,
      this.solutionNavDefinitions$,
      this.activeSolutionNavDefinitionId$.pipe(distinctUntilChanged()),
      this.location$,
    ])
      .pipe(takeUntil(this.stop$), debounceTime(20))
      .subscribe(([activeNodes, definitions, activeSolution, location]) => {
        if (
          activeNodes.length > 0 ||
          activeSolution === null ||
          Object.keys(definitions).length === 0 ||
          Object.keys(this.projectNavigationNavTreeFlattened).length === 0
        ) {
          return;
        }

        // We have an active solution navigation but no active nodes, this means that
        // the current location is not part of the current solution navigation.
        // We need to find the correct solution navigation based on the current location.
        let found = false;

        Object.entries(definitions).forEach(([id, definition]) => {
          combineLatest([definition.navigationTree$, this.deepLinksMap$, this.cloudLinks$])
            .pipe(
              take(1),
              map(([def, deepLinksMap, cloudLinks]) =>
                parseNavigationTree(def, {
                  deepLinks: deepLinksMap,
                  cloudLinks,
                })
              )
            )
            .subscribe(({ navigationTree }) => {
              if (found) return;

              const maybeActiveNodes = this.findActiveNodes({
                location,
                flattendTree: flattenNav(navigationTree),
              });

              if (maybeActiveNodes.length > 0) {
                found = true;
                this.changeActiveSolutionNavigation(id);
              }
            });
        });
      });
  }

  private setSideNavComponent(component: SideNavComponent | null) {
    this.customProjectSideNavComponent$.next({ current: component });
  }

  private changeActiveSolutionNavigation(
    id: string | null,
    { onlyIfNotSet = false, redirect = false } = {}
  ) {
    if (this.activeSolutionNavDefinitionId$.getValue() === id) return;
    if (onlyIfNotSet && this.activeSolutionNavDefinitionId$.getValue() !== null) {
      return;
    }

    const definitions = this.solutionNavDefinitions$.getValue();
    this.activeSolutionNavDefinitionId$.next(null);
    // We don't want to change to "classic" if `id` is `null` when we haven't received
    // any definitions yet. Serverless Kibana could be impacted by this.
    // When we **do** have definitions, then passing `null` does mean we should change to "classic".
    if (Object.keys(definitions).length > 0) {
      if (id === null) {
        this.setChromeStyle('classic');
        this.navigationTree$.next(undefined);
      } else {
        const definition = definitions[id];
        if (!definition) {
          throw new Error(`Solution navigation definition with id "${id}" does not exist.`);
        }

        this.setChromeStyle('project');

        const { sideNavComponent } = definition;
        if (sideNavComponent) {
          this.setSideNavComponent(sideNavComponent);
        }

        let location: Location | undefined;
        if (redirect) {
          // Navigate to the new home page if it's defined, otherwise navigate to the default home page
          const link = this.navLinksService?.get(definition.homePage ?? 'home');
          if (link) {
            const linkUrl = this.http?.basePath.remove(link.url) ?? link.url;
            location = createLocation(linkUrl);
            this.location$.next(location);
            this.application?.navigateToUrl(link.href);
          }
        }

        // We want to pass the upcoming location where we are going to navigate to
        // so we can immediately set the active nodes based on the new location and we
        // don't have to wait for the location change event to be triggered.
        this.initNavigation(definition.navigationTree$, location);
      }
    }

    this.activeSolutionNavDefinitionId$.next(id);
  }

  private getSolutionsNavDefinitions$() {
    return this.solutionNavDefinitions$.asObservable();
  }

  private getActiveSolutionNavDefinition$() {
    return combineLatest([this.solutionNavDefinitions$, this.activeSolutionNavDefinitionId$]).pipe(
      takeUntil(this.stop$),
      map(([definitions, id]) => {
        if (id === null) return null;
        if (Object.keys(definitions).length === 0) return null;
        if (!definitions[id]) {
          throw new Error(`Solution navigation definition with id "${id}" does not exist.`);
        }
        // We strip out the sideNavComponent from the definition as it should only be used internally
        const { sideNavComponent, ...definition } = definitions[id];
        return definition;
      })
    );
  }

  private updateSolutionNavigations(
    solutionNavs: SolutionNavigationDefinitions,
    replace: boolean = false
  ) {
    if (replace) {
      this.solutionNavDefinitions$.next(solutionNavs);
    } else {
      this.solutionNavDefinitions$.next({
        ...this.solutionNavDefinitions$.getValue(),
        ...solutionNavs,
      });
    }
  }

  public stop() {
    this.stop$.next();
    this.unlistenHistory?.();
  }
}
