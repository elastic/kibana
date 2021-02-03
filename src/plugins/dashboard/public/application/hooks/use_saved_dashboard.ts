/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
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
