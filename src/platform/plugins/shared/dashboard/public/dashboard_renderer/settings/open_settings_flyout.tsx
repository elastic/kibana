/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';

import { toMountPoint } from '@kbn/react-kibana-mount';

import { DashboardApi } from '../../dashboard_api/types';
import { DashboardContext } from '../../dashboard_api/use_dashboard_api';
import { coreServices } from '../../services/kibana_services';
import { DashboardSettingsFlyout } from './settings_flyout';

export function openSettingsFlyout(dashboardApi: DashboardApi) {
  dashboardApi.openOverlay(
    coreServices.overlays.openFlyout(
      toMountPoint(
        <DashboardContext.Provider value={dashboardApi}>
          <DashboardSettingsFlyout
            onClose={() => {
              dashboardApi.clearOverlays();
            }}
          />
        </DashboardContext.Provider>,
        coreServices
      ),
      {
        size: 's',
        'data-test-subj': 'dashboardSettingsFlyout',
        onClose: (flyout) => {
          dashboardApi.clearOverlays();
          flyout.close();
        },
      }
    )
  );
}
