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
import type { DashboardApi } from '../dashboard_api/types';
import { coreServices, embeddableService } from '../services/kibana_services';

export async function addFromLibrary(dashboardApi: DashboardApi) {
  openLazyFlyout({
    core: coreServices,
    parentApi: dashboardApi,
    loadContent: async ({ ariaLabelledBy }) => {
      const Component = await embeddableService.getAddFromLibraryComponent();
      return <Component container={dashboardApi} modalTitleId={ariaLabelledBy} />;
    },
    flyoutProps: {
      'data-test-subj': 'dashboardAddPanel',
      triggerId: 'dashboardAddTopNavButton',
    },
  });
}
