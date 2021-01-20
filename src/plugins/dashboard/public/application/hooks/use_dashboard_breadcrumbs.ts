/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { useEffect } from 'react';
import _ from 'lodash';
import { EUI_MODAL_CANCEL_BUTTON } from '@elastic/eui';

import { useKibana } from '../../services/kibana_react';

import { DashboardStateManager } from '../dashboard_state_manager';
import {
  getDashboardBreadcrumb,
  getDashboardTitle,
  leaveConfirmStrings,
} from '../../dashboard_strings';
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

    const {
      getConfirmButtonText,
      getCancelButtonText,
      getLeaveTitle,
      getLeaveSubtitle,
    } = leaveConfirmStrings;

    setBreadcrumbs([
      {
        text: getDashboardBreadcrumb(),
        'data-test-subj': 'dashboardListingBreadcrumb',
        onClick: () => {
          if (dashboardStateManager.getIsDirty()) {
            openConfirm(getLeaveSubtitle(), {
              confirmButtonText: getConfirmButtonText(),
              cancelButtonText: getCancelButtonText(),
              defaultFocusedButton: EUI_MODAL_CANCEL_BUTTON,
              title: getLeaveTitle(),
            }).then((isConfirmed) => {
              if (isConfirmed) {
                redirectTo({ destination: 'listing' });
              }
            });
          } else {
            redirectTo({ destination: 'listing' });
          }
        },
      },
      {
        text: getDashboardTitle(
          dashboardStateManager.getTitle(),
          dashboardStateManager.getViewMode(),
          dashboardStateManager.getIsDirty(timefilter),
          dashboardStateManager.isNew()
        ),
      },
    ]);
  }, [dashboardStateManager, timefilter, openConfirm, redirectTo, setBreadcrumbs]);
};
