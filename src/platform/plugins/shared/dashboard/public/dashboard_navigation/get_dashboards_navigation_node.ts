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
  from,
  map,
  type Observable,
  startWith,
  switchMap,
  timer,
} from 'rxjs';

import {
  createDashboardsNavigationNode,
  type DashboardsNavigationNodeOptions,
} from '../../common';
import { getDashboardRecentlyAccessedService } from '../services/dashboard_recently_accessed_service';
import { createDashboardFavoritesClient, fetchStarredDashboards } from './fetch_starred_dashboards';
import type { DashboardNavigationPanelItem } from './types';
import { toAbsoluteNavHref } from './to_absolute_nav_href';

const RECENT_DASHBOARDS_LIMIT = 5;
const STARRED_DASHBOARDS_REFRESH_MS = 5000;

const mapRecentDashboards = (
  core: CoreStart,
  recent: ReturnType<ReturnType<typeof getDashboardRecentlyAccessedService>['get']>
): DashboardNavigationPanelItem[] =>
  recent.slice(0, RECENT_DASHBOARDS_LIMIT).map((item) => ({
    id: `recent_${item.id}`,
    title: item.label,
    href: toAbsoluteNavHref(core.http.basePath.prepend(item.link.split('?')[0])),
  }));

export const getDashboardsNavigationNode$ = (
  core: CoreStart,
  options: Omit<DashboardsNavigationNodeOptions, 'recentDashboards' | 'starredDashboards'> = {}
): Observable<NodeDefinition> => {
  const recentlyAccessed = getDashboardRecentlyAccessedService();
  const favoritesClient = createDashboardFavoritesClient(core);

  const starredDashboards$ = timer(0, STARRED_DASHBOARDS_REFRESH_MS).pipe(
    switchMap(() => from(fetchStarredDashboards(core, favoritesClient)))
  );

  return combineLatest([
    recentlyAccessed.get$().pipe(startWith(recentlyAccessed.get())),
    starredDashboards$,
  ]).pipe(
    map(([recent, starred]) =>
      createDashboardsNavigationNode({
        ...options,
        recentDashboards: mapRecentDashboards(core, recent),
        starredDashboards: starred,
      })
    )
  );
};
