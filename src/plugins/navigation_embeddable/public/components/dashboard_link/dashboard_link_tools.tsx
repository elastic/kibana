/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { isEmpty, filter } from 'lodash';

import {
  cleanEmptyKeys,
  getEmbeddableParams,
  DashboardAppLocatorParams,
} from '@kbn/dashboard-plugin/public';
import {
  DashboardDrilldownOptions,
  DEFAULT_DASHBOARD_DRILLDOWN_OPTIONS,
} from '@kbn/presentation-util-plugin/public';
import { isFilterPinned } from '@kbn/es-query';
import { KibanaLocation } from '@kbn/share-plugin/public';
import { setStateToKbnUrl } from '@kbn/kibana-utils-plugin/public';

import { DashboardItem } from '../../embeddable/types';
import { NavigationEmbeddable } from '../../embeddable';
import { NavigationEmbeddableLink } from '../../../common/content_management';
import { coreServices, dashboardServices } from '../../services/kibana_services';

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

/**
 * ----------------------------------
 * Navigate from one dashboard to another
 * ----------------------------------
 */

interface NavigateToDashboardProps {
  link: NavigationEmbeddableLink;
  navEmbeddable: NavigationEmbeddable;
  modifiedClick: boolean; // true if either shift, ctrl, or meta (command on Mac) is pressed on click
}

export const navigateToDashboard = async ({
  link,
  navEmbeddable,
  modifiedClick,
}: NavigateToDashboardProps) => {
  const options: DashboardDrilldownOptions = {
    ...DEFAULT_DASHBOARD_DRILLDOWN_OPTIONS,
    ...link.options,
  };
  const params: DashboardAppLocatorParams = {
    dashboardId: link.destination,
    ...getEmbeddableParams(navEmbeddable, options),
  };

  const locator = dashboardServices.locator; // TODO: Make this generic as part of https://github.com/elastic/kibana/issues/164748
  if (locator) {
    const { app, path, state }: KibanaLocation<DashboardAppLocatorParams> =
      await locator.getLocation(params);

    /**
     * the app state should be sent via URL if either (a) the `openInNewTab` setting is `true`
     * or if (b) the click is modified (i.e. ctrl/shift/meta key was pressed on click)
     */
    if (options.openInNewTab || modifiedClick) {
      const url = coreServices.application.getUrlForApp(app, {
        path: setStateToKbnUrl(
          '_a',
          cleanEmptyKeys({
            query: state.query,
            filters: state.filters?.filter((f) => !isFilterPinned(f)),
          }),
          { useHash: false, storeInHashQuery: true },
          path
        ),
        absolute: true,
      });
      window.open(url, '_blank');
    } else {
      await coreServices.application.navigateToApp(app, {
        path,
        state,
      });
    }
  }
};
