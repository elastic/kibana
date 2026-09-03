/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DashboardState } from '../../server';
import { coreServices } from './kibana_services';

let service: DashboardChangeHistoryService | undefined;
export const getDashboardChangeHistoryService = (): DashboardChangeHistoryService => {
  if (!service) {
    service = new DashboardChangeHistoryService();
  }
  return service;
};

class DashboardChangeHistoryService {
  constructor() {}

  public async addToHistory(dashboardId: string, change: DashboardState) {
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
  }

  public cleanup() {
    return;
  }
}
