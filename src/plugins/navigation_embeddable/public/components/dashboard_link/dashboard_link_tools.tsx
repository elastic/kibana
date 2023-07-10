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
 * ----------------------------------
 * Fetch lists of dashboards
 * ----------------------------------
 */

interface FetchDashboardsProps {
  size?: number;
  search?: string;
  currentDashboardId?: string;
  selectedDashboardId?: string;
}

const fetchDashboards = async ({
  search = '',
  size = 10,
  currentDashboardId,
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
    /** ... filter out both the current and parent dashboard from the list ... */
    dashboardList = filter(dashboardList, (dash) => {
      return dash.id !== currentDashboardId && dash.id !== selectedDashboardId;
    });

    /** ... so that we can force them to the top of the list as necessary. */
    if (currentDashboardId) {
      dashboardList.pop(); // the result should still be of `size,` so remove the dashboard at the end of the list
      dashboardList.unshift(await fetchDashboard(currentDashboardId)); // in order to force the current dashboard to the start of the list
    }

    if (selectedDashboardId !== currentDashboardId && selectedDashboardId) {
      dashboardList.pop();
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
  async ({ search, size, currentDashboardId, selectedDashboardId }: FetchDashboardsProps) => {
    return await fetchDashboards({
      search,
      size,
      currentDashboardId,
      selectedDashboardId,
    });
  },
  ({ search, size, currentDashboardId, selectedDashboardId }) => {
    return [search, size, currentDashboardId, selectedDashboardId].join('|');
  }
);
