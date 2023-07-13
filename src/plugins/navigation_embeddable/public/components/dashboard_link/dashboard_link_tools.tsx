/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { isEmpty, memoize, filter } from 'lodash';
import { DashboardItem } from '../../embeddable/types';

import { dashboardServices } from '../../services/kibana_services';

/**
 * ----------------------------------
 * Fetch a single dashboard
 * ----------------------------------
 */

export const fetchDashboard = async (dashboardId: string): Promise<DashboardItem> => {
  const findDashboardsService = await dashboardServices.findDashboardsService();
  const response = (await findDashboardsService.findByIds([dashboardId]))[0];
  if (response.status === 'error') {
    throw new Error('failure'); // TODO: better error handling
  }
  return response;
};

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

/**
 * ----------------------------------
 * Fetch lists of dashboards
 * ----------------------------------
 */

interface FetchDashboardsProps {
  size?: number;
  search?: string;
  parentDashboardId?: string;
  selectedDashboardId?: string;
}

const fetchDashboards = async ({
  search = '',
  size = 10,
  parentDashboardId,
  selectedDashboardId,
}: FetchDashboardsProps): Promise<DashboardItem[]> => {
  const findDashboardsService = await dashboardServices.findDashboardsService();
  const responses = await findDashboardsService.search({
    search,
    size,
    options: { onlyTitle: true },
  });

  let dashboardList: DashboardItem[] = responses.hits;

  /** If there is no search string... */
  if (isEmpty(search)) {
    /** ... filter out both the parent and selected dashboard from the list ... */
    dashboardList = filter(dashboardList, (dash) => {
      return dash.id !== parentDashboardId && dash.id !== selectedDashboardId;
    });

    /** ... so that we can force them to the top of the list as necessary. */
    if (parentDashboardId) {
      dashboardList.unshift(await fetchDashboard(parentDashboardId));
    }

    if (selectedDashboardId && selectedDashboardId !== parentDashboardId) {
      dashboardList.unshift(await fetchDashboard(selectedDashboardId));
    }
  }

  /** Then, only return the parts of the dashboard object that we need */
  const simplifiedDashboardList = dashboardList.map((hit) => {
    return { id: hit.id, attributes: hit.attributes };
  });

  return simplifiedDashboardList;
};

export const memoizedFetchDashboards = memoize(
  async ({ search, size, parentDashboardId, selectedDashboardId }: FetchDashboardsProps) => {
    return await fetchDashboards({
      search,
      size,
      parentDashboardId,
      selectedDashboardId,
    });
  },
  ({ search, size, parentDashboardId, selectedDashboardId }) => {
    return [search, size, parentDashboardId, selectedDashboardId].join('|');
  }
);
