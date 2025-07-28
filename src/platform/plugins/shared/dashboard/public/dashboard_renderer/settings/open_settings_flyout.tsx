/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';

import { openLazyFlyout } from '@kbn/presentation-util';
import { DashboardApi } from '../../dashboard_api/types';
import { DashboardContext } from '../../dashboard_api/use_dashboard_api';
import { coreServices } from '../../services/kibana_services';

export function openSettingsFlyout(dashboardApi: DashboardApi) {
  openLazyFlyout({
    core: coreServices,
    parentApi: dashboardApi,
    loadContent: async ({ closeFlyout, ariaLabelledBy }) => {
      const { DashboardSettingsFlyout } = await import('./settings_flyout');
      return (
        <DashboardContext.Provider value={dashboardApi}>
          <DashboardSettingsFlyout onClose={closeFlyout} ariaLabelledBy={ariaLabelledBy} />
        </DashboardContext.Provider>
      );
    },
    flyoutProps: {
      'data-test-subj': 'dashboardSettingsFlyout',
    },
    triggerId: 'dashboardSettingsButton',
  });
}
