/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DashboardState } from '@kbn/as-code-dashboard-schema';
import { coreServices } from '../services/kibana_services';

export const logDashboardChanges = async (dashboardId: string, change: DashboardState) => {
  console.log({ change });
  try {
    const result = await coreServices.http.post(
      `/internal/dashboard/change_history/${encodeURIComponent(dashboardId)}`,
      {
        body: JSON.stringify(change),
        method: 'POST',
        // keepalive: true, // allows edits to be tracked on refresh + tab close
      }
    );
    console.log({ result });
  } catch (e) {
    console.log({ e });
  }
};
