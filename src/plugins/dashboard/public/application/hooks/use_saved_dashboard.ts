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

import { useEffect, useState } from 'react';
import { History } from 'history';
import { DashboardConstants, DashboardSavedObject } from '../..';
import { DashboardAppServices } from '../types';
import { dashboard60Warning } from '../dashboard_strings';
import { SavedObjectNotFound } from '../../../../kibana_utils/public';

export function useSavedDashboard(
  services: DashboardAppServices,
  history: History,
  savedDashboardId?: string
) {
  const [savedDashboard, setSavedDashboard] = useState<DashboardSavedObject | undefined>();

  useEffect(() => {
    const {
      savedDashboards,
      core: { notifications },
      data: { indexPatterns },
      chrome: { docTitle, recentlyAccessed },
    } = services;

    indexPatterns
      .ensureDefaultIndexPattern()
      ?.then(() => savedDashboards.get(savedDashboardId) as Promise<DashboardSavedObject>)
      .then(async (newSavedDashboard) => {
        // if you've loaded an existing dashboard, add it to the recently accessed and update doc title
        if (savedDashboardId) {
          docTitle.change(newSavedDashboard.title);
          recentlyAccessed.add(
            newSavedDashboard.getFullPath(),
            newSavedDashboard.title,
            savedDashboardId
          );
        }
        setSavedDashboard(newSavedDashboard);
      })
      .catch((error) => {
        // Preserve BWC of v5.3.0 links for new, unsaved dashboards.
        // See https://github.com/elastic/kibana/issues/10951 for more context.
        if (error instanceof SavedObjectNotFound && savedDashboardId === 'create') {
          // Note preserve querystring part is necessary so the state is preserved through the redirect.
          history.replace({
            ...history.location, // preserve query,
            pathname: DashboardConstants.CREATE_NEW_DASHBOARD_URL,
          });

          notifications.toasts.addWarning(dashboard60Warning);
        } else {
          // E.g. a corrupt or deleted dashboard
          notifications.toasts.addDanger(error.message);
          history.push(DashboardConstants.LANDING_PAGE_PATH);
        }
      });
    return () => {
      setSavedDashboard(undefined);
    };
  }, [services, history, savedDashboardId]);

  return savedDashboard;
}
