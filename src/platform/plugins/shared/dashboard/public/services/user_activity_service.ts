/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { type Subscription } from 'rxjs';
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
  private bindedVisibilityHandler;

  private activitySubscription: Subscription;
  private eventStacks: {
    view: Array<{ start: number }>;
    refresh: Array<{ type: 'manual' | 'auto'; start: number }>;
  } = {
    view: [],
    refresh: [],
  };

  constructor(api: DashboardApi) {
    this.api = api;
    this.activitySubscription = api.userActivity$.subscribe((activity) => {
      if (activity.start) {
        if (activity.type === 'view') {
          this.eventStacks.view.push({ start: activity.start });
        } else {
          this.eventStacks.refresh.push({
            type: activity.refreshType,
            start: activity.start,
          });
        }
      } else {
        const start = this.eventStacks[activity.type].pop();
        if (!start) {
          return;
        }
        if (activity.type === 'view') {
          this.logUserActivity(activity.type, start.start, activity.end!);
        } else {
          const refreshStart = start as (typeof this.eventStacks)['refresh'][number];
          this.logUserActivity(
            `${activity.type}_${refreshStart.type}`,
            refreshStart.start,
            activity.end!
          );
        }
      }
    });
    this.bindedVisibilityHandler = this.onVisibilityChange.bind(this);
    document.addEventListener('visibilitychange', this.bindedVisibilityHandler);
  }

  public cleanup() {
    session = undefined;
    this.activitySubscription.unsubscribe();
    document.removeEventListener('visibilitychange', this.bindedVisibilityHandler);
  }

  private async logUserActivity(
    type: 'view' | 'refresh_manual' | 'refresh_auto',
    start: number,
    end: number
  ) {
    const activityType = type.includes('refresh') ? 'refresh' : type;
    const result = await coreServices.http.post(
      `/internal/dashboard/user_activity/${encodeURIComponent(activityType)}/${encodeURIComponent(
        this.api.uuid
      )}`,
      {
        body: JSON.stringify({
          title: this.api.title$.getValue(),
          start,
          end,
        }),
        method: 'POST',
        asSystemRequest: true,
        ...(type === 'view' && { keepalive: true }), // allows views to be tracked on refresh + tab close
      }
    );
    return result;
  }

  private async onVisibilityChange() {
    this.api.userActivity$.next({
      type: 'view',
      ...(document.visibilityState === 'visible' ? { start: Date.now() } : { end: Date.now() }),
    });
  }
}
