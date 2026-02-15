/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { InternalApplicationStart } from '@kbn/core-application-browser-internal';
import type {
  ChromeNavLinks,
  ChromeBreadcrumb,
  ChromeSetProjectBreadcrumbsParams,
  ChromeProjectNavigationNode,
  NavigationTreeDefinition,
  SolutionNavigationDefinitions,
  SolutionNavigationOrderings,
  NavigationOrdering,
  CloudLinks,
  SolutionId,
} from '@kbn/core-chrome-browser';
import type { InternalHttpStart } from '@kbn/core-http-browser-internal';
import type { IUiSettingsClient } from '@kbn/core-ui-settings-browser';
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

import type {
  AppDeepLinkId,
  ChromeNavLink,
  CloudURLs,
  NavigationTreeDefinitionUI,
  NavigationItemInfo,
} from '@kbn/core-chrome-browser';
import type { Logger } from '@kbn/logging';
import type { FeatureFlagsStart } from '@kbn/core-feature-flags-browser';

import { findActiveNodes, flattenNav, parseNavigationTree, stripQueryParams } from './utils';
import { buildBreadcrumbs } from './breadcrumbs';
import { getCloudLinks } from './cloud_links';

interface StartDeps {
  application: InternalApplicationStart;
  navLinksService: ChromeNavLinks;
  http: InternalHttpStart;
  chromeBreadcrumbs$: Observable<ChromeBreadcrumb[]>;
  logger: Logger;
  featureFlags: FeatureFlagsStart;
  uiSettings: IUiSettingsClient;
}

export class ProjectNavigationService {
  private static readonly CUSTOM_NAV_STORAGE_KEY = 'kibana.solutionNavigationOrdering';
  private static readonly LOCKED_ITEM_IDS = new Set(['discover', 'dashboards']);

  private logger: Logger | undefined;
  private projectHome$ = new BehaviorSubject<string | undefined>(undefined);
  private kibanaName$ = new BehaviorSubject<string | undefined>(undefined);
  private feedbackUrlParams$ = new BehaviorSubject<URLSearchParams | undefined>(undefined);
  private navigationTree$ = new BehaviorSubject<ChromeProjectNavigationNode[] | undefined>(
    undefined
  );
  // The flattened version of the navigation tree for quicker access
  private projectNavigationNavTreeFlattened: Record<string, ChromeProjectNavigationNode> = {};
  // The navigation tree for the Side nav UI that still contains layout information (body, footer, etc.)
  private navigationTreeUi$ = new BehaviorSubject<NavigationTreeDefinitionUI | null>(null);
  private activeNodes$ = new BehaviorSubject<ChromeProjectNavigationNode[][]>([]);

  private projectBreadcrumbs$ = new BehaviorSubject<{
    breadcrumbs: ChromeBreadcrumb[];
    params: ChromeSetProjectBreadcrumbsParams;
  }>({ breadcrumbs: [], params: { absolute: false } });
  private readonly stop$ = new ReplaySubject<void>(1);
  private readonly solutionNavDefinitions$ = new BehaviorSubject<SolutionNavigationDefinitions>({});
  // Per-solution navigation ordering configurations
  private readonly solutionNavigationOrderings$ = new BehaviorSubject<SolutionNavigationOrderings>(
    {}
  );
  // As the active definition **id** and the definitions are set independently, one before the other without
  // any guarantee of order, we need to store the next active definition id in a separate BehaviorSubject
  private readonly nextSolutionNavDefinitionId$ = new BehaviorSubject<SolutionId | null>(null);
  // The active solution navigation definition id that has been initiated and is currently active
  private readonly activeSolutionNavDefinitionId$ = new BehaviorSubject<SolutionId | null>(null);
  private readonly activeDataTestSubj$ = new BehaviorSubject<string | undefined>(undefined);
  private readonly location$ = new BehaviorSubject<Location>(createLocation('/'));
  private deepLinksMap$: Observable<Record<string, ChromeNavLink>> = of({});
  private cloudLinks$ = new BehaviorSubject<CloudLinks>({});
  private application?: InternalApplicationStart;
  private navLinksService?: ChromeNavLinks;
  private _http?: InternalHttpStart;
  private uiSettings?: IUiSettingsClient;
  private navigationChangeSubscription?: Subscription;
  private unlistenHistory?: () => void;

  constructor(private isServerless: boolean) {}

  public start({
    application,
    navLinksService,
    http,
    chromeBreadcrumbs$,
    logger,
    uiSettings,
  }: StartDeps) {
    this.application = application;
    this.navLinksService = navLinksService;
    this._http = http;
    this.logger = logger;
    this.uiSettings = uiSettings;

    this.onHistoryLocationChange(application.history.location);
    this.unlistenHistory = application.history.listen(this.onHistoryLocationChange.bind(this));

    this.initCustomNavigationFromStorage();

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
        return this.projectHome$.pipe(map((home) => this.uiSettings?.get('defaultRoute') || home));
      },
      setCloudUrls: (cloudUrls: CloudURLs) => {
        this.cloudLinks$.next(getCloudLinks(cloudUrls));
      },
      setFeedbackUrlParams: (feedbackUrlParams: URLSearchParams) => {
        this.feedbackUrlParams$.next(feedbackUrlParams);
      },
      setKibanaName: (kibanaName: string) => {
        this.kibanaName$.next(kibanaName);
      },
      getKibanaName$: () => {
        return this.kibanaName$.asObservable();
      },
      getFeedbackUrlParams$: () => {
        return this.feedbackUrlParams$.asObservable();
      },
      initNavigation: <LinkId extends AppDeepLinkId = AppDeepLinkId>(
        id: SolutionId,
        navTreeDefinition$: Observable<NavigationTreeDefinition<LinkId>>,
        config?: { dataTestSubj?: string }
      ) => {
        this.initNavigation(id, navTreeDefinition$, config);
      },
      getNavigationTreeUi$: this.getNavigationTreeUi$.bind(this),
      getNavigationItems$: this.getNavigationItems$.bind(this),
      getActiveNodes$: () => {
        return this.activeNodes$.pipe(takeUntil(this.stop$), distinctUntilChanged(deepEqual));
      },
      setProjectBreadcrumbs: (
        breadcrumbs: ChromeBreadcrumb | ChromeBreadcrumb[],
        params?: Partial<ChromeSetProjectBreadcrumbsParams>
      ) => {
        this.projectBreadcrumbs$.next({
          breadcrumbs: Array.isArray(breadcrumbs) ? breadcrumbs : [breadcrumbs],
          params: { absolute: false, ...params },
        });
      },
      getProjectBreadcrumbs$: (): Observable<ChromeBreadcrumb[]> => {
        return combineLatest([
          this.projectBreadcrumbs$,
          this.activeNodes$,
          chromeBreadcrumbs$,
          this.kibanaName$,
          this.cloudLinks$,
        ]).pipe(
          map(([projectBreadcrumbs, activeNodes, chromeBreadcrumbs, kibanaName, cloudLinks]) => {
            return buildBreadcrumbs({
              kibanaName,
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
      /** In stateful Kibana, register solution navigations */
      updateSolutionNavigations: this.updateSolutionNavigations.bind(this),
      setNavigationOrdering: this.setNavigationOrdering.bind(this),
      setTemporaryOrdering: this.setTemporaryOrdering.bind(this),
      clearTemporaryOrdering: this.clearTemporaryOrdering.bind(this),
      /** In stateful Kibana, change the active solution navigation */
      changeActiveSolutionNavigation: this.changeActiveSolutionNavigation.bind(this),
      /** In stateful Kibana, get the active solution navigation definition */
      getActiveSolutionNavDefinition$: this.getActiveSolutionNavDefinition$.bind(this),
      /** In stateful Kibana, get the id of the active solution navigation */
      getActiveSolutionNavId$: () => this.activeSolutionNavDefinitionId$.asObservable(),
      getActiveDataTestSubj$: () => this.activeDataTestSubj$.asObservable(),
    };
  }

  /**
   * Initialize a "serverless style" navigation. For stateful deployments (not serverless), this
   * handler initialize one of the solution navigations registered.
   *
   * @param id Id for the navigation tree definition
   * @param navTreeDefinition$ The navigation tree definition
   * @param config Optional configuration object, currently only supports `dataTestSubj` to set the data-test-subj attribute for the navigation container
   */
  private initNavigation(
    id: SolutionId,
    navTreeDefinition$: Observable<NavigationTreeDefinition>,
    config?: { dataTestSubj?: string }
  ) {
    if (this.activeSolutionNavDefinitionId$.getValue() === id) return;

    if (config?.dataTestSubj) {
      this.activeDataTestSubj$.next(config.dataTestSubj);
    }

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
          return parseNavigationTree(id, def, {
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

  /**
   * Returns a simplified list of navigation items for the editor modal.
   * Only includes id, title, and hidden status.
   */
  private getNavigationItems$(): Observable<NavigationItemInfo[]> {
    return this.navigationTreeUi$.pipe(
      filter((tree): tree is NavigationTreeDefinitionUI => tree !== null),
      map((tree) =>
        tree.body
          .filter((node) => node.renderAs !== 'home') // Exclude the solution home/logo item
          .map((node) => ({
            id: node.id,
            title: node.title || node.id,
            hidden: node.sideNavStatus === 'hidden',
            locked: ProjectNavigationService.LOCKED_ITEM_IDS.has(node.id),
          }))
      )
    );
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

        const { homePage = '' } = definition;

        this.waitForLink(homePage, (navLink: ChromeNavLink) => {
          this.setProjectHome(navLink.href);
        });

        // Merge original tree with ordering configuration if it exists for this solution
        const effectiveTree$ = combineLatest([
          definition.navigationTree$,
          this.solutionNavigationOrderings$,
        ]).pipe(
          map(([original, orderings]) => {
            const ordering = orderings[nextId];
            if (!ordering) return original;
            return this.applyOrdering(original, ordering);
          })
        );

        this.initNavigation(nextId, effectiveTree$, {
          dataTestSubj: definition.dataTestSubj,
        });
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

  private changeActiveSolutionNavigation(id: SolutionId | null) {
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

        return definitions[id]!;
      })
    );
  }

  private updateSolutionNavigations(
    solutionNavs: SolutionNavigationDefinitions,
    replace: boolean = false
  ) {
    const existingDefinitions = this.solutionNavDefinitions$.getValue();

    if (replace) {
      this.solutionNavDefinitions$.next(solutionNavs);
    } else {
      this.solutionNavDefinitions$.next({
        ...existingDefinitions,
        ...solutionNavs,
      });
    }
  }

  /**
   * Apply ordering configuration to a navigation tree.
   * Reorders top-level items and marks hidden items with sideNavStatus: 'hidden'.
   * Note: Core items (discover, dashboards) are always kept at the top and cannot be hidden.
   */
  private applyOrdering(
    tree: NavigationTreeDefinition,
    ordering: NavigationOrdering
  ): NavigationTreeDefinition {
    const { order, hiddenIds } = ordering;
    // Filter out locked items from hidden set - they cannot be hidden
    const hiddenSet = new Set(
      hiddenIds.filter((id) => !ProjectNavigationService.LOCKED_ITEM_IDS.has(id))
    );

    const getItemId = (item: (typeof tree.body)[number]): string | undefined =>
      item.id ?? item.link;

    const lockedItems: typeof tree.body = [];
    const regularItems: typeof tree.body = [];

    for (const item of tree.body) {
      const itemId = getItemId(item);
      if (itemId && ProjectNavigationService.LOCKED_ITEM_IDS.has(itemId)) {
        lockedItems.push(item);
      } else {
        regularItems.push(item);
      }
    }

    const itemMap = new Map(regularItems.map((item) => [getItemId(item), item]));

    const orderedRegularItems: typeof tree.body = [];
    for (const id of order) {
      if (ProjectNavigationService.LOCKED_ITEM_IDS.has(id)) continue;

      const item = itemMap.get(id);
      if (item) {
        orderedRegularItems.push(item);
        itemMap.delete(id);
      }
    }

    for (const item of itemMap.values()) {
      orderedRegularItems.push(item);
    }

    // Apply hidden status to regular items
    const processedRegularItems = orderedRegularItems.map((item) => {
      const itemId = getItemId(item);
      if (itemId && hiddenSet.has(itemId)) {
        return { ...item, sideNavStatus: 'hidden' as const };
      }
      return item;
    });

    return {
      ...tree,
      body: [...lockedItems, ...processedRegularItems],
    };
  }

  private setNavigationOrdering(id: SolutionId, ordering: NavigationOrdering | undefined) {
    const current = this.solutionNavigationOrderings$.getValue();

    if (ordering === undefined) {
      const { [id]: _, ...rest } = current;
      this.solutionNavigationOrderings$.next(rest);
    } else {
      this.solutionNavigationOrderings$.next({ ...current, [id]: ordering });
    }

    this.persistNavigationOrderings();
  }

  private setTemporaryOrdering(id: SolutionId, ordering: NavigationOrdering) {
    const current = this.solutionNavigationOrderings$.getValue();
    this.solutionNavigationOrderings$.next({ ...current, [id]: ordering });
    // No persistence - this is for live preview only
  }

  private clearTemporaryOrdering(_id: SolutionId) {
    // Restore from localStorage
    this.initCustomNavigationFromStorage();
  }

  private initCustomNavigationFromStorage() {
    try {
      const stored = localStorage.getItem(ProjectNavigationService.CUSTOM_NAV_STORAGE_KEY);
      if (!stored) return;

      const data = JSON.parse(stored) as SolutionNavigationOrderings;
      this.solutionNavigationOrderings$.next(data);
    } catch (e) {
      // Invalid stored data, ignore
    }
  }

  private persistNavigationOrderings() {
    try {
      const current = this.solutionNavigationOrderings$.getValue();

      if (Object.keys(current).length === 0) {
        localStorage.removeItem(ProjectNavigationService.CUSTOM_NAV_STORAGE_KEY);
      } else {
        localStorage.setItem(
          ProjectNavigationService.CUSTOM_NAV_STORAGE_KEY,
          JSON.stringify(current)
        );
      }
    } catch (e) {
      this.logger?.warn('Failed to persist navigation orderings to localStorage');
    }
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
