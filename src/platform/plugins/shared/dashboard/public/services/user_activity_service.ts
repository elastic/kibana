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

const sessions = new Map<string, DashboardUserActivitySession>();
export const getDashboardUserActivityService = (api: DashboardApi) => {
  if (!sessions.has(api.uuid)) {
    sessions.set(api.uuid, new DashboardUserActivitySession(api));
  }
  return sessions.get(api.uuid)!;
};

class DashboardUserActivitySession {
  private api: DashboardApi;
  private bindedVisibilityHandler;

  private activitySubscription: Subscription;
  private eventQueues: {
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
          this.eventQueues.view.push({ start: activity.start });
        } else {
          this.eventQueues.refresh.push({
            type: activity.refreshType,
            start: activity.start,
          });
        }
      } else {
        const event = this.eventQueues[activity.type].shift();
        if (!event) {
          return;
        }
        if (activity.type === 'view') {
          this.logUserActivity(activity.type, event.start, activity.end!);
        } else {
          const refreshStart = event as (typeof this.eventQueues)['refresh'][number];
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
    sessions.delete(this.api.uuid);
    this.activitySubscription.unsubscribe();
    document.removeEventListener('visibilitychange', this.bindedVisibilityHandler);
  }

  private async logUserActivity(
    type: 'view' | 'refresh_manual' | 'refresh_auto',
    start: number,
    end: number
  ) {
    const result = await coreServices.http.post(
      `/internal/dashboard/user_activity/${encodeURIComponent(type)}/${encodeURIComponent(
        this.api.uuid
      )}`,
      {
        body: JSON.stringify({
          title: this.api.title$.getValue(),
          start,
          end,
          tags: this.api.getSettings().tags,
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
