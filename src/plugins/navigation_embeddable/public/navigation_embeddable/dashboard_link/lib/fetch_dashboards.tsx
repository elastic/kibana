/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { isEmpty } from 'lodash';

import { DashboardItem } from '../types';
import { dashboardServices } from '../../services/kibana_services';

export const fetchCurrentDashboard = async (currentDashboardId: string): Promise<DashboardItem> => {
  const findDashboardsService = await dashboardServices.findDashboardsService();
  const response = (await findDashboardsService.findByIds([currentDashboardId]))[0];
  if (response.status === 'error') {
    throw new Error('failure'); // TODO: better error handling
  }
  return response;
};

export const fetchDashboardList = async (
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
      currentDashboard = await fetchCurrentDashboard(currentDashboardId);
      dashboardList.pop(); // the result should still be of `size,` so remove the dashboard at the end of the list
      dashboardList.unshift(currentDashboard); // in order to force the current dashboard to the start of the list
    }
  }

  console.log('currentDashboard', currentDashboard);

  /** Then, only return the parts of the dashboard object that we need */
  const simplifiedDashboardList = dashboardList.map((hit) => {
    return { id: hit.id, attributes: hit.attributes };
  });

  return simplifiedDashboardList;
};
