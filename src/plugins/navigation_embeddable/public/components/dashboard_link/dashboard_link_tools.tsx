/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { isEmpty, memoize } from 'lodash';
import { DashboardItem } from '../../embeddable/types';

import { dashboardServices } from '../../services/kibana_services';

/**
 * Memoized fetch dashboard will only refetch the dashboard information if the given `dashboardId` changed between
 * calls; otherwise, it will use the cached dashboard, which may not take into account changes to the dashboard's title
 * description, etc. Be mindful when choosing the memoized version.
 */
export const memoizedFetchDashboard = memoize(
  async (dashboardId: string) => {
    return await fetchDashboard(dashboardId);
  },
  (dashboardId) => {
    return dashboardId;
  }
);

export const fetchDashboard = async (dashboardId: string): Promise<DashboardItem> => {
  const findDashboardsService = await dashboardServices.findDashboardsService();
  const response = (await findDashboardsService.findByIds([dashboardId]))[0];
  if (response.status === 'error') {
    throw new Error('failure'); // TODO: better error handling
  }
  return response;
};

export const memoizedFetchDashboards = memoize(
  async (search: string = '', size: number = 10, currentDashboardId?: string) => {
    return await fetchDashboards(search, size, currentDashboardId);
  },
  (search, size, currentDashboardId) => {
    return [search, size, currentDashboardId].join('|');
  }
);

const fetchDashboards = async (
  search: string = '',
  size: number = 10,
  currentDashboardId?: string
): Promise<DashboardItem[]> => {
  const findDashboardsService = await dashboardServices.findDashboardsService();
  const responses = await findDashboardsService.search({
    search,
    size,
    options: { onlyTitle: true },
  });

  let currentDashboard: DashboardItem | undefined;
  let dashboardList: DashboardItem[] = responses.hits;

  /** When the parent dashboard has been saved (i.e. it has an ID) and there is no search string ... */
  if (currentDashboardId && isEmpty(search)) {
    /** ...force the current dashboard (if it is present in the original search results) to the top of the list */
    dashboardList = dashboardList.sort((dashboard) => {
      const isCurrentDashboard = dashboard.id === currentDashboardId;
      if (isCurrentDashboard) {
        currentDashboard = dashboard;
      }
      return isCurrentDashboard ? -1 : 1;
    });

    /**
     * If the current dashboard wasn't returned in the original search, perform another search to find it and
     * force it to the front of the list
     */
    if (!currentDashboard) {
      currentDashboard = await fetchDashboard(currentDashboardId);
      dashboardList.pop(); // the result should still be of `size,` so remove the dashboard at the end of the list
      dashboardList.unshift(currentDashboard); // in order to force the current dashboard to the start of the list
    }
  }

  /** Then, only return the parts of the dashboard object that we need */
  const simplifiedDashboardList = dashboardList.map((hit) => {
    return { id: hit.id, attributes: hit.attributes };
  });

  return simplifiedDashboardList;
};
