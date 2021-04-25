/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useEffect } from 'react';
import _ from 'lodash';

import { useKibana } from '../../services/kibana_react';

import { DashboardStateManager } from '../dashboard_state_manager';
import { getDashboardBreadcrumb, getDashboardTitle } from '../../dashboard_strings';
import { DashboardAppServices, DashboardRedirect } from '../types';

export const useDashboardBreadcrumbs = (
  dashboardStateManager: DashboardStateManager | null,
  redirectTo: DashboardRedirect
) => {
  const { data, core, chrome } = useKibana<DashboardAppServices>().services;

  // Destructure and rename services; makes the Effect hook more specific, makes later
  // abstraction of service dependencies easier.
  const { setBreadcrumbs } = chrome;
  const { timefilter } = data.query.timefilter;
  const { openConfirm } = core.overlays;

  // Sync breadcrumbs when Dashboard State Manager changes
  useEffect(() => {
    if (!dashboardStateManager) {
      return;
    }

    setBreadcrumbs([
      {
        text: getDashboardBreadcrumb(),
        'data-test-subj': 'dashboardListingBreadcrumb',
        onClick: () => {
          redirectTo({ destination: 'listing' });
        },
      },
      {
        text: getDashboardTitle(
          dashboardStateManager.getTitle(),
          dashboardStateManager.getViewMode(),
          dashboardStateManager.isNew()
        ),
      },
    ]);
  }, [dashboardStateManager, timefilter, openConfirm, redirectTo, setBreadcrumbs]);
};
