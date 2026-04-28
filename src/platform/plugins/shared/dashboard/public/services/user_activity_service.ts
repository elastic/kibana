/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { coreServices } from './kibana_services';

const sessions: { [id: string]: DashboardViewSession } = {};

export const getDashboardUserActivityService = (id: string) => {
  if (!sessions[id]) {
    console.log('create new');
    sessions[id] = new DashboardViewSession(id);
  } else {
    console.log('return old');
  }
  return sessions[id];
};

class DashboardViewSession {
  private id: string;
  private startTime: number | undefined;
  private bindedVisibilityHandler;

  constructor(id: string) {
    this.id = id;
    this.bindedVisibilityHandler = this.onVisibilityChange.bind(this);
    document.addEventListener('visibilitychange', this.bindedVisibilityHandler);
  }

  public startDashboardView() {
    this.startTime = Date.now();
  }

  public async endDashboardView(title: string) {
    const result = await this.logDashboardView(title);
    this.cleanup();
    return result;
  }

  private async logDashboardView(title: string) {
    const result = await coreServices.http.post(
      `/internal/dashboard/user_activity/view/${this.id}`,
      {
        body: JSON.stringify({
          title,
          start: this.startTime,
          end: Date.now(),
        }),
        method: 'POST',
        keepalive: true,
        asSystemRequest: true,
      }
    );
    return result;
  }

  private cleanup() {
    delete sessions[this.id];
    document.removeEventListener('visibilitychange', this.bindedVisibilityHandler);
  }

  private async onVisibilityChange() {
    // window.alert(`on visibility change: ${document.visibilityState}`);
    if (document.visibilityState === 'visible') {
      this.startTime = Date.now();
    } else {
      await this.logDashboardView('title');
    }
  }
}
