/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DashboardSanitizeResponseBody, DashboardState } from '../../server';
import { DASHBOARD_INTERNAL_API_PATH } from '../../common/constants';
import { coreServices } from '../services/kibana_services';

const DEFAULT_DASHBOARD_TITLE = 'New dashboard';

export async function sanitizeDashboard(dashboardState: DashboardState) {
  const normalizedTitle = dashboardState.title.trim();
  const dashboardStateWithTitle: DashboardState =
    normalizedTitle.length > 0
      ? dashboardState
      : {
          ...dashboardState,
          title: DEFAULT_DASHBOARD_TITLE,
        };

  const result = await coreServices.http.post<DashboardSanitizeResponseBody>(
    `${DASHBOARD_INTERNAL_API_PATH}/_sanitize`,
    {
      version: '1',
      body: JSON.stringify(dashboardStateWithTitle),
    }
  );

  return {
    data: result.data,
    warnings: result.warnings ?? [],
  };
}
