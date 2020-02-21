/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import url from 'url';
import { TimeRange, Filter, Query } from '../../data/public';
import { setStateToKbnUrl } from '../../kibana_utils/public';
import { DirectAccessLinkSpec } from '../../direct_access_links/public';

export const STATE_STORAGE_KEY = '_a';
export const GLOBAL_STATE_STORAGE_KEY = '_g';

export const DASHBOARD_APP_LINK_GENERATOR = 'DASHBOARD_APP_LINK_GENERATOR';

export interface DashboardAppLinkGeneratorState {
  State: {
    dashboardId?: string;
    timeRange?: TimeRange;
    filters?: Filter[];
    query?: Query;
    // If not given, will use the uiSettings configuration
    useHash?: boolean;
  };
}

export const createDirectAccessDashboardLinkGenerator = (
  getStartServices: () => Promise<{ appBasePath: string; useHashedUrl: boolean }>
): DirectAccessLinkSpec<typeof DASHBOARD_APP_LINK_GENERATOR> => ({
  id: DASHBOARD_APP_LINK_GENERATOR,
  createUrl: async state => {
    const startServices = await getStartServices();
    const useHash = state.useHash || startServices.useHashedUrl;
    const appBasePath = startServices.appBasePath;
    const parsedUrl = url.parse(window.location.href);
    const hash = state.dashboardId ? `dashboard/${state.dashboardId}` : `dashboard`;

    const dashboardAppUrl = url.format({
      protocol: parsedUrl.protocol,
      host: parsedUrl.host,
      pathname: `${appBasePath}`,
      hash,
    });

    const appStateUrl = setStateToKbnUrl(
      STATE_STORAGE_KEY,
      {
        query: state.query,
        filters: state.filters,
      },
      { useHash },
      dashboardAppUrl
    );

    return setStateToKbnUrl(
      GLOBAL_STATE_STORAGE_KEY,
      {
        timeRange: state.timeRange,
      },
      { useHash },
      appStateUrl
    );
  },
});
