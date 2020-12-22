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
import _ from 'lodash';

import { useKibana } from '../../services/kibana_react';

import { DashboardConstants } from '../..';
import { DashboardSavedObject } from '../../saved_dashboards';
import { getDashboard60Warning } from '../../dashboard_strings';
import { DashboardAppServices } from '../types';

export const useSavedDashboard = (savedDashboardId: string | undefined, history: History) => {
  const { data, core, chrome, savedDashboards } = useKibana<DashboardAppServices>().services;
  const [savedDashboard, setSavedDashboard] = useState<DashboardSavedObject | null>(null);

  // Destructure and rename services; makes the Effect hook more specific, makes later
  // abstraction of service dependencies easier.
  const { indexPatterns } = data;
  const { recentlyAccessed: recentlyAccessedPaths, docTitle } = chrome;
  const { toasts } = core.notifications;

  useEffect(() => {
    (async function loadSavedDashboard() {
      if (savedDashboardId === 'create') {
        history.replace({
          ...history.location, // preserve query,
          pathname: DashboardConstants.CREATE_NEW_DASHBOARD_URL,
        });

        toasts.addWarning(getDashboard60Warning());
        return;
      }

      await indexPatterns.ensureDefaultIndexPattern();

      try {
        const dashboard = (await savedDashboards.get(savedDashboardId)) as DashboardSavedObject;
        const { title, getFullPath } = dashboard;
        if (savedDashboardId) {
          recentlyAccessedPaths.add(getFullPath(), title, savedDashboardId);
        }

        docTitle.change(title);
        setSavedDashboard(dashboard);
      } catch (error) {
        // E.g. a corrupt or deleted dashboard
        toasts.addDanger(error.message);
        history.push(DashboardConstants.LANDING_PAGE_PATH);
      }
    })();
    return () => setSavedDashboard(null);
  }, [
    docTitle,
    history,
    indexPatterns,
    recentlyAccessedPaths,
    savedDashboardId,
    savedDashboards,
    toasts,
  ]);

  return savedDashboard;
};
