/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreStart } from '@kbn/core/public';
import type { NodeDefinition } from '@kbn/core-chrome-browser';
import {
  combineLatest,
  debounceTime,
  defer,
  filter,
  from,
  fromEvent,
  map,
  merge,
  type Observable,
  of,
  skip,
  switchMap,
} from 'rxjs';

import {
  createDashboardsNavigationNode,
  type DashboardsNavigationNodeOptions,
} from '../../common';
import { getDashboardRecentlyAccessedService } from '../services/dashboard_recently_accessed_service';
import { createDashboardFavoritesClient, fetchStarredDashboards } from './fetch_starred_dashboards';
import { starredDashboardsRefresh$ } from './starred_dashboards_refresh';
import type { DashboardNavigationPanelItem } from './types';
import { toAbsoluteNavHref } from './to_absolute_nav_href';

const RECENT_DASHBOARDS_LIMIT = 7;
/** Delay before reordering recent dashboards in the side nav after a visit is recorded. */
export const RECENT_DASHBOARDS_REORDER_DELAY_MS = 1200;

const mapRecentDashboards = (
  core: CoreStart,
  recent: ReturnType<ReturnType<typeof getDashboardRecentlyAccessedService>['get']>
): DashboardNavigationPanelItem[] =>
  recent.slice(0, RECENT_DASHBOARDS_LIMIT).map((item) => ({
    id: `recent_${item.id}`,
    title: item.label,
    href: toAbsoluteNavHref(core.http.basePath.prepend(item.link.split('?')[0])),
  }));

const fetchStarredDashboards$ = (
  core: CoreStart,
  favoritesClient: ReturnType<typeof createDashboardFavoritesClient>
) => defer(() => from(fetchStarredDashboards(core, favoritesClient)));

const createRecentDashboards$ = (
  recentlyAccessed: ReturnType<typeof getDashboardRecentlyAccessedService>
): Observable<ReturnType<typeof recentlyAccessed.get>> =>
  merge(
    of(recentlyAccessed.get()),
    recentlyAccessed.get$().pipe(skip(1), debounceTime(RECENT_DASHBOARDS_REORDER_DELAY_MS))
  );

export const getDashboardsNavigationNode$ = (
  core: CoreStart,
  options: Omit<DashboardsNavigationNodeOptions, 'recentDashboards' | 'starredDashboards'> = {}
): Observable<NodeDefinition> => {
  const recentlyAccessed = getDashboardRecentlyAccessedService();
  const favoritesClient = createDashboardFavoritesClient(core);

  const starredDashboards$ = merge(
    of([] as DashboardNavigationPanelItem[]),
    fetchStarredDashboards$(core, favoritesClient),
    starredDashboardsRefresh$.pipe(switchMap(() => fetchStarredDashboards$(core, favoritesClient))),
    fromEvent(document, 'visibilitychange').pipe(
      filter(() => document.visibilityState === 'visible'),
      switchMap(() => fetchStarredDashboards$(core, favoritesClient))
    )
  );

  return combineLatest([createRecentDashboards$(recentlyAccessed), starredDashboards$]).pipe(
    map(([recent, starred]) =>
      createDashboardsNavigationNode({
        ...options,
        recentDashboards: mapRecentDashboards(core, recent),
        starredDashboards: starred,
      })
    )
  );
};
