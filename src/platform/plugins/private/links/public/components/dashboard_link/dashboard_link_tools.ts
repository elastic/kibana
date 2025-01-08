/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isEmpty, filter } from 'lodash';

import { DashboardItem } from '../../types';
import { dashboardServices } from '../../services/kibana_services';

/**
 * ----------------------------------
 * Fetch a single dashboard
 * ----------------------------------
 */

export const fetchDashboard = async (dashboardId: string): Promise<DashboardItem> => {
  const findDashboardsService = await dashboardServices.findDashboardsService();
  const response = await findDashboardsService.findById(dashboardId);
  if (response.status === 'error') {
    throw new Error(response.error.message);
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
  parentDashboardId?: string;
  selectedDashboardId?: string;
}

export const fetchDashboards = async ({
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
      const selectedDashboard = await fetchDashboard(selectedDashboardId).catch(() => {
        /**
         * Swallow the error thrown, since this just means the selected dashboard was deleted and therefore
         * it should not be added to the top of the dashboard list
         */
      });
      if (selectedDashboard) dashboardList.unshift(await fetchDashboard(selectedDashboardId));
    }
  }

  /** Then, only return the parts of the dashboard object that we need */
  const simplifiedDashboardList = dashboardList.map((hit) => {
    return { id: hit.id, attributes: hit.attributes };
  });

  return simplifiedDashboardList;
};
