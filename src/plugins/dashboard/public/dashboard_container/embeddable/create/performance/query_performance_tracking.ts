/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { reportPerformanceMetricEvent } from '@kbn/ebt-tools';
import { PresentationContainer, TracksQueryPerformance } from '@kbn/presentation-containers';
import { apiPublishesPhaseEvents, PublishesPhaseEvents } from '@kbn/presentation-publishing';
import { combineLatest, map, of, pairwise, startWith, switchMap } from 'rxjs';
import { DASHBOARD_LOADED_EVENT } from '../../../../dashboard_constants';
import { pluginServices } from '../../../../services/plugin_services';
import { DashboardLoadType } from '../../../types';

let isFirstDashboardLoadOfSession = true;

const loadTypesMapping: { [key in DashboardLoadType]: number } = {
  sessionFirstLoad: 0,
  dashboardFirstLoad: 1,
  dashboardSubsequentLoad: 2,
};

export const startQueryPerformanceTracking = (
  dashboard: PresentationContainer & TracksQueryPerformance
) => {
  const { analytics } = pluginServices.getServices();
  const reportPerformanceMetrics = ({
    timeToData,
    panelCount,
    totalLoadTime,
    loadType,
  }: {
    timeToData: number;
    panelCount: number;
    totalLoadTime: number;
    loadType: DashboardLoadType;
  }) => {
    const duration =
      loadType === 'dashboardSubsequentLoad' ? timeToData : Math.max(timeToData, totalLoadTime);

    reportPerformanceMetricEvent(analytics, {
      eventName: DASHBOARD_LOADED_EVENT,
      duration,
      key1: 'time_to_data',
      value1: timeToData,
      key2: 'num_of_panels',
      value2: panelCount,
      key4: 'load_type',
      value4: loadTypesMapping[loadType],
    });
  };

  return dashboard.children$
    .pipe(
      switchMap((children) => {
        const childPhaseEventTrackers: PublishesPhaseEvents[] = [];
        for (const child of Object.values(children)) {
          if (apiPublishesPhaseEvents(child)) childPhaseEventTrackers.push(child);
        }
        if (childPhaseEventTrackers.length === 0) return of([]);
        return combineLatest(childPhaseEventTrackers.map((child) => child.phase$));
      }),
      map((latestPhaseEvents) =>
        latestPhaseEvents.some((phaseEvent) => phaseEvent && phaseEvent.status !== 'rendered')
      ),
      startWith(false),
      pairwise()
    )
    .subscribe(([lastLoading, currentLoading]) => {
      const panelCount = dashboard.getPanelCount();
      const now = performance.now();
      const loadType: DashboardLoadType = isFirstDashboardLoadOfSession
        ? 'sessionFirstLoad'
        : dashboard.firstLoad
        ? 'dashboardFirstLoad'
        : 'dashboardSubsequentLoad';

      const queryHasStarted = !lastLoading && currentLoading;
      const queryHasFinished = lastLoading && !currentLoading;

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
};
