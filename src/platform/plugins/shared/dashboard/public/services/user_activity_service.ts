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
    sessions[id] = new DashboardViewSession(id);
  }
  return sessions[id];
};

class DashboardViewSession {
  private id: string;
  private startTime: number | undefined;

  constructor(id: string) {
    this.id = id;
  }

  startDashboardView() {
    this.startTime = Date.now();
    console.log('START', this.startTime);
  }

  async endDashboardView(title: string) {
    console.log('END', this.id, title, this.startTime);
    const result = await coreServices.http.post(
      `/internal/dashboard/user_activity/view/${this.id}`,
      {
        body: JSON.stringify({
          title,
          start: this.startTime,
          end: Date.now(),
        }),
        method: 'POST',
        asSystemRequest: true,
      }
    );
    this.startTime = undefined;
    return result;
  }
}
