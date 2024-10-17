/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { combineLatest, map, pairwise, startWith, switchMap, skipWhile, of } from 'rxjs';

import { reportPerformanceMetricEvent } from '@kbn/ebt-tools';
import { PresentationContainer, TracksQueryPerformance } from '@kbn/presentation-containers';
import { PublishesPhaseEvents, apiPublishesPhaseEvents } from '@kbn/presentation-publishing';

import { DASHBOARD_LOADED_EVENT } from '../../../../dashboard_constants';
import { coreServices } from '../../../../services/kibana_services';
import { DashboardLoadType } from '../../../types';

let isFirstDashboardLoadOfSession = true;

const loadTypesMapping: { [key in DashboardLoadType]: number } = {
  sessionFirstLoad: 0, // on first time the SO is loaded
  dashboardFirstLoad: 1, // on initial load navigating into it
  dashboardSubsequentLoad: 2, // on filter-refresh
};

export function startQueryPerformanceTracking(
  dashboard: PresentationContainer & TracksQueryPerformance
) {
  return dashboard.children$
    .pipe(
      skipWhile((children) => {
        // Don't track render-status when the dashboard is still adding embeddables.
        return Object.values(children).length !== dashboard.getPanelCount();
      }),
      map((children) => {
        // Filter for embeddables which publish phase events
        const childPhaseEventTrackers: PublishesPhaseEvents[] = [];
        const values = Object.values(children);
        for (const child of values) {
          if (apiPublishesPhaseEvents(child)) {
            childPhaseEventTrackers.push(child);
          }
        }
        return childPhaseEventTrackers;
      }),
      switchMap((children) => {
        if (children.length === 0) {
          return of([]); // map to empty stream
        }
        // Map to new stream of phase-events for each embeddable
        return combineLatest(children.map((child) => child.phase$));
      }),
      map((latestPhaseEvents) => {
        // Map individual render-state of panels to global render-state.
        return latestPhaseEvents.some((phaseEvent) => {
          return phaseEvent && phaseEvent.status !== 'rendered';
        });
      }),
      startWith(false),
      pairwise()
    )
    .subscribe(([wasDashboardStillLoading, isDashboardStillLoading]: [boolean, boolean]) => {
      const panelCount = dashboard.getPanelCount();
      const now = performance.now();
      const loadType: DashboardLoadType = isFirstDashboardLoadOfSession
        ? 'sessionFirstLoad'
        : dashboard.firstLoad
        ? 'dashboardFirstLoad'
        : 'dashboardSubsequentLoad';

      const queryHasStarted = !wasDashboardStillLoading && isDashboardStillLoading;
      const queryHasFinished = wasDashboardStillLoading && !isDashboardStillLoading;

      if (dashboard.firstLoad && (panelCount === 0 || queryHasFinished)) {
        /**
         * we consider the Dashboard creation to be finished when all the panels are loaded.
         */
        dashboard.creationEndTime = now;
        isFirstDashboardLoadOfSession = false;
        dashboard.firstLoad = false;
      }

      if (queryHasStarted) {
        dashboard.lastLoadStartTime = now;
        return;
      }

      if (queryHasFinished) {
        const timeToData = now - (dashboard.lastLoadStartTime ?? now);
        const completeLoadDuration =
          (dashboard.creationEndTime ?? now) - (dashboard.creationStartTime ?? now);
        reportPerformanceMetrics({
          timeToData,
          panelCount,
          totalLoadTime: completeLoadDuration,
          loadType,
        });
      }
    });
}

function reportPerformanceMetrics({
  timeToData,
  panelCount,
  totalLoadTime,
  loadType,
}: {
  timeToData: number;
  panelCount: number;
  totalLoadTime: number;
  loadType: DashboardLoadType;
}) {
  const duration =
    loadType === 'dashboardSubsequentLoad' ? timeToData : Math.max(timeToData, totalLoadTime);

  const e = {
    eventName: DASHBOARD_LOADED_EVENT,
    duration,
    key1: 'time_to_data',
    value1: timeToData,
    key2: 'num_of_panels',
    value2: panelCount,
    key4: 'load_type',
    value4: loadTypesMapping[loadType],
  };
  reportPerformanceMetricEvent(coreServices.analytics, e);
}
