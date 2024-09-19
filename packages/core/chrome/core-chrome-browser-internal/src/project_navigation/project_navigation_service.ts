/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
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
  CloudLinks,
} from '@kbn/core-chrome-browser';
import type { InternalHttpStart } from '@kbn/core-http-browser-internal';
import {
  Subject,
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
  timer,
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
  // Keep a reference to the nav node selected when the navigation panel is opened
  private readonly panelSelectedNode$ = new BehaviorSubject<ChromeProjectNavigationNode | null>(
    null
  );

  private projectBreadcrumbs$ = new BehaviorSubject<{
    breadcrumbs: ChromeProjectBreadcrumb[];
    params: ChromeSetProjectBreadcrumbsParams;
  }>({ breadcrumbs: [], params: { absolute: false } });
  private readonly stop$ = new ReplaySubject<void>(1);
  private readonly solutionNavDefinitions$ = new BehaviorSubject<SolutionNavigationDefinitions>({});
  // As the active definition **id** and the definitions are set independently, one before the other without
  // any guarantee of order, we need to store the next active definition id in a separate BehaviorSubject
  private readonly nextSolutionNavDefinitionId$ = new BehaviorSubject<string | null>(null);
  // The active solution navigation definition id that has been initiated and is currently active
  private readonly activeSolutionNavDefinitionId$ = new BehaviorSubject<string | null>(null);
  private readonly location$ = new BehaviorSubject<Location>(createLocation('/'));
  private deepLinksMap$: Observable<Record<string, ChromeNavLink>> = of({});
  private cloudLinks$ = new BehaviorSubject<CloudLinks>({});
  private application?: InternalApplicationStart;
  private navLinksService?: ChromeNavLinks;
  private _http?: InternalHttpStart;
  private navigationChangeSubscription?: Subscription;
  private unlistenHistory?: () => void;

  constructor(private isServerless: boolean) {}

  public start({ application, navLinksService, http, chromeBreadcrumbs$, logger }: StartDeps) {
    this.application = application;
    this.navLinksService = navLinksService;
    this._http = http;
    this.logger = logger;
    this.onHistoryLocationChange(application.history.location);
    this.unlistenHistory = application.history.listen(this.onHistoryLocationChange.bind(this));

    this.handleActiveNodesChange();
    this.handleSolutionNavDefinitionChange();

    this.deepLinksMap$ = navLinksService.getNavLinks$().pipe(
      map((navLinks) => {
        return navLinks.reduce((acc, navLink) => {
          acc[navLink.id] = navLink;
          return acc;
        }, {} as Record<string, ChromeNavLink>);
      })
    );

    return {
      setProjectHome: this.setProjectHome.bind(this),
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
        id: string,
        navTreeDefinition$: Observable<NavigationTreeDefinition<LinkId>>
      ) => {
        this.initNavigation(id, navTreeDefinition$);
      },
      getNavigationTreeUi$: this.getNavigationTreeUi$.bind(this),
      getActiveNodes$: () => {
        return this.activeNodes$.pipe(takeUntil(this.stop$), distinctUntilChanged(deepEqual));
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
          this.cloudLinks$,
        ]).pipe(
          map(([projectBreadcrumbs, activeNodes, chromeBreadcrumbs, projectName, cloudLinks]) => {
            return buildBreadcrumbs({
              projectName,
              projectBreadcrumbs,
              activeNodes,
              chromeBreadcrumbs,
              cloudLinks,
              isServerless: this.isServerless,
            });
          })
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
      /** In stateful Kibana, get the id of the active solution navigation */
      getActiveSolutionNavId$: () => this.activeSolutionNavDefinitionId$.asObservable(),
      getPanelSelectedNode$: () => this.panelSelectedNode$.asObservable(),
      setPanelSelectedNode: this.setPanelSelectedNode.bind(this),
    };
  }

  /**
   * Initialize a "serverless style" navigation. For stateful deployments (not serverless), this
   * handler initialize one of the solution navigations registered.
   *
   * @param id Id for the navigation tree definition
   * @param navTreeDefinition$ The navigation tree definition
   */
  private initNavigation(id: string, navTreeDefinition$: Observable<NavigationTreeDefinition>) {
    if (this.activeSolutionNavDefinitionId$.getValue() === id) return;

    if (this.navigationChangeSubscription) {
      this.navigationChangeSubscription.unsubscribe();
    }

    let initialised = false;
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
          this.updateActiveProjectNavigationNodes();

          if (!initialised) {
            this.activeSolutionNavDefinitionId$.next(id);
            initialised = true;
          }
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
    if (!Object.keys(flattendTree).length) return [];

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
   * @param forceUpdate Optional flag to force the update of the active nodes even if the active nodes are the same
   */
  private updateActiveProjectNavigationNodes({
    location,
  }: { location?: Location } = {}): ChromeProjectNavigationNode[][] {
    const activeNodes = this.findActiveNodes({ location });
    this.activeNodes$.next(activeNodes);
    return activeNodes;
  }

  private onHistoryLocationChange(location: Location) {
    this.updateActiveProjectNavigationNodes({ location });
    this.location$.next(location);
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

  private setSideNavComponent(component: SideNavComponent | null) {
    this.customProjectSideNavComponent$.next({ current: component });
  }

  private handleSolutionNavDefinitionChange() {
    combineLatest([
      this.solutionNavDefinitions$,
      this.nextSolutionNavDefinitionId$.pipe(distinctUntilChanged()),
    ])
      .pipe(takeUntil(this.stop$))
      .subscribe(([definitions, nextId]) => {
        const definition = typeof nextId === 'string' ? definitions[nextId] : undefined;
        const noActiveDefinition =
          Object.keys(definitions).length === 0 || !definition || nextId === null;

        if (noActiveDefinition) {
          this.navigationTree$.next(undefined);
          this.activeNodes$.next([]);
          return;
        }

        const { sideNavComponent, homePage = '' } = definition;

        if (sideNavComponent) {
          this.setSideNavComponent(sideNavComponent);
        }

        this.waitForLink(homePage, (navLink: ChromeNavLink) => {
          this.setProjectHome(navLink.href);
        });

        this.initNavigation(nextId, definition.navigationTree$);
      });
  }

  /**
   * This method waits for the chrome nav link to be available and then calls the callback.
   * This is necessary to avoid race conditions when we register the solution navigation
   * before the deep links are available (plugins can register them later).
   *
   * @param linkId The chrome nav link id
   * @param cb The callback to call when the link is found
   * @returns
   */
  private waitForLink(linkId: string, cb: (chromeNavLink: ChromeNavLink) => undefined): void {
    if (!this.navLinksService) return;

    let navLink: ChromeNavLink | undefined = this.navLinksService.get(linkId);
    if (navLink) {
      cb(navLink);
      return;
    }

    const stop$ = new Subject<void>();
    const tenSeconds = timer(10000);

    this.deepLinksMap$.pipe(takeUntil(tenSeconds), takeUntil(stop$)).subscribe((navLinks) => {
      navLink = navLinks[linkId];

      if (navLink) {
        cb(navLink);
        stop$.next();
      }
    });
  }

  private setProjectHome(homeHref: string) {
    this.projectHome$.next(homeHref);
  }

  private changeActiveSolutionNavigation(id: string | null) {
    if (this.nextSolutionNavDefinitionId$.getValue() === id) return;
    this.nextSolutionNavDefinitionId$.next(id);
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
        if (!definitions[id]) return null;

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

  private setPanelSelectedNode = (_node: string | ChromeProjectNavigationNode | null) => {
    const node = typeof _node === 'string' ? this.findNodeByPath(_node) : _node;
    this.panelSelectedNode$.next(node);
  };

  private findNodeByPath(path: string): ChromeProjectNavigationNode | null {
    const allNodes = this.navigationTree$.getValue();
    if (!allNodes) return null;

    const find = (nodes: ChromeProjectNavigationNode[]): ChromeProjectNavigationNode | null => {
      // Recursively search for the node with the given path
      for (const node of nodes) {
        if (node.path === path) {
          return node;
        }
        if (node.children) {
          const found = find(node.children);
          if (found) {
            return found;
          }
        }
      }
      return null;
    };

    return find(allNodes);
  }

  private get http() {
    if (!this._http) {
      throw new Error('Http service not provided.');
    }
    return this._http;
  }

  public stop() {
    this.stop$.next();
    this.unlistenHistory?.();
  }
}
