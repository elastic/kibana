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
  private currentEvents: {
    view: { start: number } | undefined; // only one view can be tracked at a time
    refresh: Array<{ start: number }>; // represents a queue of refresh events
  } = { view: undefined, refresh: [] };

  constructor(api: DashboardApi) {
    this.api = api;
    this.activitySubscription = api.userActivity$
      .pipe(
        map((activity) => {
          if (activity.start) {
            if (activity.type === 'view' && !this.currentEvents.view) {
              this.currentEvents.view = { start: activity.start };
            } else {
              this.currentEvents.refresh.push({ start: activity.start });
            }
            return;
          }
          /** The event ended - return the activity so that it can be logged */
          return activity;
        }),
        filter((activity) => activity !== undefined), // filter out activities that haven't ended
        concatMap(async (activity) => {
          const event =
            activity.type === 'view' ? this.currentEvents.view : this.currentEvents.refresh.shift();
          if (!event) {
            return;
          }
          try {
            await this.logUserActivity(activity.type, event.start, activity.end!);
            if (activity.type === 'view') {
              delete this.currentEvents.view;
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
    const dashboardId = this.api.savedObjectId$.getValue() ?? this.api.uuid;

    let meta;
    if (type === 'refresh') {
      const state = this.api.getSerializedState();
      const refreshInterval = dataService.query.timefilter.timefilter.getRefreshInterval();
      // time range is not serialized when `timeRestore` is false so cannot rely on the serialized state
      const timeRange = state.attributes.time_range ?? this.api.timeRange$.getValue();
      meta = {
        // setting time range from/to explicitly to keep expected order
        ...(timeRange && { time_range: { from: timeRange?.from, to: timeRange?.to } }),
        ...(refreshInterval &&
          !refreshInterval.pause && { refresh_interval: refreshInterval.value }),
        query: state.attributes.query,
        filters: state.attributes.filters,
        panel_count: this.api.getPanelCount(),
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
    }

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
          ...(meta && { meta }),
        }),
        method: 'POST',
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
