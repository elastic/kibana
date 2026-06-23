/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreStart } from '@kbn/core/public';
import type { FavoritesClientPublic } from '@kbn/content-management-favorites-public';
import { FavoritesClient } from '@kbn/content-management-favorites-public';

import { DASHBOARD_APP_ID } from '../../common/page_bundle_constants';
import { DASHBOARD_SAVED_OBJECT_TYPE } from '../../common/constants';
import { findService } from '../dashboard_client/find_service';
import { createDashboardEditUrl } from '../utils/urls';
import { usageCollectionService } from '../services/kibana_services';
import type { DashboardNavigationPanelItem } from './types';
import { toAbsoluteNavHref } from './to_absolute_nav_href';
import { refreshStarredDashboardsNavigation } from './starred_dashboards_refresh';

class DashboardFavoritesClient extends FavoritesClient {
  public override async addFavorite(params: { id: string }) {
    const result = await super.addFavorite(params);
    refreshStarredDashboardsNavigation();
    return result;
  }

  public override async removeFavorite(params: { id: string }) {
    const result = await super.removeFavorite(params);
    refreshStarredDashboardsNavigation();
    return result;
  }
}

export const createDashboardFavoritesClient = (core: CoreStart): FavoritesClientPublic =>
  new DashboardFavoritesClient(DASHBOARD_APP_ID, DASHBOARD_SAVED_OBJECT_TYPE, {
    http: core.http,
    userProfile: core.userProfile,
    usageCollection: usageCollectionService,
  });

export const fetchStarredDashboards = async (
  core: CoreStart,
  favoritesClient: FavoritesClientPublic
): Promise<DashboardNavigationPanelItem[]> => {
  if (!(await favoritesClient.isAvailable())) {
    return [];
  }

  const { favoriteIds } = await favoritesClient.getFavorites();
  if (favoriteIds.length === 0) {
    return [];
  }

  const results = await findService.findByIds(favoriteIds);
  const titleById = new Map(
    results
      .filter((result) => result.status === 'success')
      .map((result) => [result.id, result.attributes.title])
  );

  return favoriteIds
    .filter((id) => titleById.has(id))
    .map((id) => {
      const relativeUrl = core.application.getUrlForApp(DASHBOARD_APP_ID, {
        path: `#${createDashboardEditUrl(id)}`,
      });

      return {
        id: `starred_${id}`,
        title: titleById.get(id)!,
        href: toAbsoluteNavHref(relativeUrl),
      };
    });
};
