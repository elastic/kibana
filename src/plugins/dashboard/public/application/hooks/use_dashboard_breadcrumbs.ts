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

import { useEffect } from 'react';
import _ from 'lodash';
import { EUI_MODAL_CANCEL_BUTTON } from '@elastic/eui';

import { useKibana } from '../../../../kibana_react/public';

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
