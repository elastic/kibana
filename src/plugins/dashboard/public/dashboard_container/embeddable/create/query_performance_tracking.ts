/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { reportPerformanceMetricEvent } from '@kbn/ebt-tools';
import { apiPublishesPhaseEvents, PublishesPhaseEvents } from '@kbn/presentation-publishing';
import { combineLatest, map, of, pairwise, startWith, switchMap } from 'rxjs';
import { DASHBOARD_LOADED_EVENT } from '../../../dashboard_constants';
import { pluginServices } from '../../../services/plugin_services';
import { DashboardLoadType } from '../../types';
import type { DashboardContainer } from '../dashboard_container';

let isFirstDashboardLoadOfSession = true;

const loadTypesMapping: { [key in DashboardLoadType]: number } = {
  sessionFirstLoad: 0,
  dashboardFirstLoad: 1,
  dashboardSubsequentLoad: 2,
};

export const startQueryPerformanceTracking = (dashboard: DashboardContainer) => {
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
    console.log('reporting!', { timeToData, totalLoadTime, loadType });
    reportPerformanceMetricEvent(analytics, {
      eventName: DASHBOARD_LOADED_EVENT,
      duration: Math.max(timeToData, totalLoadTime),
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
        return combineLatest(childPhaseEventTrackers.map((child) => child.onPhaseChange));
      }),
      map((latestPhaseEvents) =>
        latestPhaseEvents.some((phaseEvent) => phaseEvent && phaseEvent.status !== 'rendered')
      ),
      startWith(false),
      pairwise()
    )
    .subscribe(([lastLoading, currentLoading]) => {
      const panelCount = Object.keys(dashboard.getInput().panels).length;
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
        dashboard.lastloadStartTime = now;
        return;
      }
      if (queryHasFinished) {
        const timeToData = now - (dashboard.lastloadStartTime ?? now);
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
