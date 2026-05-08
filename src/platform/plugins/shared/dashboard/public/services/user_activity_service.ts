/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { concatMap, filter, map, type Subscription } from 'rxjs';

import { apiPublishesBlockingError } from '@kbn/presentation-publishing';

import type { DashboardApi } from '../dashboard_api/types';
import { coreServices, dataService } from './kibana_services';

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
  private currentEvent: {
    view?: { start: number };
    refresh?: { start: number };
  } = { view: undefined, refresh: undefined };

  constructor(api: DashboardApi) {
    this.api = api;
    this.activitySubscription = api.userActivity$
      .pipe(
        map((activity) => {
          if (activity.start) {
            /** Only one event of each type is allowed to be in progress at a time */
            if (activity.type === 'view' && !this.currentEvent.view) {
              this.currentEvent.view = { start: activity.start };
            } else if (!this.currentEvent.refresh) {
              this.currentEvent.refresh = { start: activity.start };
            }
            return;
          }
          /** The event ended - return the activity so that it can be logged */
          return activity;
        }),
        filter((activity) => activity !== undefined), // filter out activities that haven't ended
        concatMap(async (activity) => {
          const event = this.currentEvent[activity.type];
          if (!event) {
            return;
          }
          try {
            await this.logUserActivity(activity.type, event.start, activity.end!);
            if (activity.type === 'view') {
              delete this.currentEvent.view;
            } else {
              delete this.currentEvent.refresh;
            }
          } catch (e) {
            // if an error is thrown when logging, do nothing; no need to surface this
          }
        })
      )
      .subscribe();

    /** Track visibility changes so that views can be started + ended when the user switches tabs */
    this.bindedVisibilityHandler = this.onVisibilityChange.bind(this);
    document.addEventListener('visibilitychange', this.bindedVisibilityHandler);
  }

  public cleanup() {
    sessions.delete(this.api.uuid);
    this.activitySubscription.unsubscribe();
    document.removeEventListener('visibilitychange', this.bindedVisibilityHandler);
  }

  private async logUserActivity(type: 'view' | 'refresh', start: number, end: number) {
    const state = this.api.getSerializedState();
    const refreshInterval = dataService.query.timefilter.timefilter.getRefreshInterval();
    const meta = {
      time_range: state.attributes.time_range,
      ...(!refreshInterval.pause && { refresh_interval: refreshInterval.value }),
      query: state.attributes.query,
      filters: state.attributes.filters,
      panel_count: state.attributes.panels.length,
      errors: Object.entries(this.api.children$.getValue()).reduce(
        (prev: Array<{ panel_id: string; error: string }>, [id, child]) => {
          if (apiPublishesBlockingError(child)) {
            const blockingError = child.blockingError$.getValue();
            if (blockingError) {
              return [...prev, { panel_id: id, error: blockingError.message }];
            }
          }
          return prev;
        },
        []
      ),
    };

    const dashboardId = this.api.savedObjectId$.getValue() ?? this.api.uuid;
    const result = await coreServices.http.post(
      `/internal/dashboard/user_activity/${encodeURIComponent(type)}/${encodeURIComponent(
        dashboardId
      )}`,
      {
        body: JSON.stringify({
          title: this.api.title$.getValue(),
          start,
          end,
          tags: this.api.getSettings().tags,
          ...(type !== 'view' && { meta }),
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
