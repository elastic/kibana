/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DashboardApi } from '../dashboard_api/types';
import { coreServices } from './kibana_services';

let session: DashboardUserActivitySession | undefined;

export const getDashboardUserActivityService = (api: DashboardApi) => {
  if (!session) {
    session = new DashboardUserActivitySession(api);
  }
  return session;
};

class DashboardUserActivitySession {
  private api: DashboardApi;
  private startViewTime: number | undefined;
  private bindedVisibilityHandler;

  constructor(api: DashboardApi) {
    this.api = api;
    this.bindedVisibilityHandler = this.onVisibilityChange.bind(this);
    document.addEventListener('visibilitychange', this.bindedVisibilityHandler);
  }

  public startDashboardView() {
    this.startViewTime = Date.now();
  }

  public async endDashboardView() {
    const result = await this.logDashboardView();
    this.cleanup();
    return result;
  }

  private async logDashboardView() {
    const result = await coreServices.http.post(
      `/internal/dashboard/user_activity/view/${this.api.uuid}`,
      {
        body: JSON.stringify({
          title: this.api.title$.getValue(),
          start: this.startViewTime,
          end: Date.now(),
        }),
        method: 'POST',
        keepalive: true, // allows views to be tracked on refresh + tab close
        asSystemRequest: true,
      }
    );
    return result;
  }

  public async logDashboardRefresh(start: number, end: number) {
    const result = await coreServices.http.post(
      `/internal/dashboard/user_activity/refresh/${this.api.uuid}`,
      {
        body: JSON.stringify({
          title: this.api.title$.getValue(),
          start,
          end,
        }),
        method: 'POST',
        asSystemRequest: true,
      }
    );
    return result;
  }

  private cleanup() {
    session = undefined;
    document.removeEventListener('visibilitychange', this.bindedVisibilityHandler);
  }

  private async onVisibilityChange() {
    if (document.visibilityState === 'visible') {
      this.startViewTime = Date.now();
    } else {
      await this.logDashboardView();
    }
  }
}
