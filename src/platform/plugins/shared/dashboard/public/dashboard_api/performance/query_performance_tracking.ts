/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { round, meanBy } from 'lodash';
import { combineLatest, map, pairwise, startWith, switchMap, skipWhile, of } from 'rxjs';

import { reportPerformanceMetricEvent } from '@kbn/ebt-tools';
import { PresentationContainer } from '@kbn/presentation-containers';
import { PublishesPhaseEvents, apiPublishesPhaseEvents } from '@kbn/presentation-publishing';
import {
  clearPerformanceTrackersByType,
  getPerformanceTrackersGroupedById,
  PERFORMANCE_TRACKER_MARKS,
  PERFORMANCE_TRACKER_MEASURES,
  PERFORMANCE_TRACKER_TYPES,
} from '@kbn/ebt-tools';

import { coreServices } from '../../services/kibana_services';
import { DASHBOARD_LOADED_EVENT } from '../../utils/telemetry_constants';

type DashboardLoadType = 'sessionFirstLoad' | 'dashboardFirstLoad' | 'dashboardSubsequentLoad';

export interface PerformanceState {
  firstLoad: boolean;
  creationStartTime?: number;
  creationEndTime?: number;
  lastLoadStartTime?: number;
}

let isFirstDashboardLoadOfSession = true;

const loadTypesMapping: { [key in DashboardLoadType]: number } = {
  sessionFirstLoad: 0, // on first time the SO is loaded
  dashboardFirstLoad: 1, // on initial load navigating into it
  dashboardSubsequentLoad: 2, // on filter-refresh
};

export function startQueryPerformanceTracking(
  dashboard: PresentationContainer,
  performanceState: PerformanceState
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
        : performanceState.firstLoad
        ? 'dashboardFirstLoad'
        : 'dashboardSubsequentLoad';

      const queryHasStarted = !wasDashboardStillLoading && isDashboardStillLoading;
      const queryHasFinished = wasDashboardStillLoading && !isDashboardStillLoading;

      if (performanceState.firstLoad && (panelCount === 0 || queryHasFinished)) {
        /**
         * we consider the Dashboard creation to be finished when all the panels are loaded.
         */
        performanceState.creationEndTime = now;
        isFirstDashboardLoadOfSession = false;
        performanceState.firstLoad = false;
      }

      if (queryHasStarted) {
        performanceState.lastLoadStartTime = now;
        return;
      }

      if (queryHasFinished) {
        const timeToData = now - (performanceState.lastLoadStartTime ?? now);
        const completeLoadDuration =
          (performanceState.creationEndTime ?? now) - (performanceState.creationStartTime ?? now);
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
  const groupedPerformanceMarkers = getPerformanceTrackersGroupedById(
    PERFORMANCE_TRACKER_TYPES.PANEL
  );

  // `groupedPerformanceMarkers` is a map of performance markers grouped by id.
  // Each group contains the performance markers for a single Lens embeddable.
  // We need to extract the start and end times of the preRender, renderStart
  // and renderComplete markers and calculate the duration of each phase.
  const measurements = Object.values(groupedPerformanceMarkers).map((markers) => {
    // Get the marker name from the first group.
    const markerName =
      Array.isArray(markers) && markers.length > 0
        ? markers[0].name.split(':').slice(0, -1).join(':')
        : undefined;

    const preRenderStart = markers.find((marker) =>
      marker.name.endsWith(`:${PERFORMANCE_TRACKER_MARKS.PRE_RENDER}`)
    )?.startTime;
    const renderStart = markers.find((marker) =>
      marker.name.endsWith(`:${PERFORMANCE_TRACKER_MARKS.RENDER_START}`)
    )?.startTime;
    const renderComplete = markers.find((marker) =>
      marker.name.endsWith(`:${PERFORMANCE_TRACKER_MARKS.RENDER_COMPLETE}`)
    )?.startTime;

    if (markerName && preRenderStart && renderStart) {
      performance.measure(`${markerName}:${PERFORMANCE_TRACKER_MEASURES.PRE_RENDER_DURATION}`, {
        start: preRenderStart,
        end: renderStart,
      });
    }

    if (markerName && renderComplete && renderStart) {
      performance.measure(`${markerName}:${PERFORMANCE_TRACKER_MEASURES.RENDER_DURATION}`, {
        start: renderStart,
        end: renderComplete,
      });
    }

    return {
      preRenderDuration: preRenderStart && renderStart ? renderStart - preRenderStart : 0,
      renderDuration: renderComplete && renderStart ? renderComplete - renderStart : 0,
    };
  });

  const performanceMetricEvent = {
    eventName: DASHBOARD_LOADED_EVENT,
    duration,
    key1: 'time_to_data',
    value1: timeToData,
    key2: 'num_of_panels',
    value2: panelCount,
    key4: 'load_type',
    value4: loadTypesMapping[loadType],
    key8: 'mean_panel_prerender',
    value8: round(meanBy(measurements, PERFORMANCE_TRACKER_MEASURES.PRE_RENDER_DURATION), 2),
    key9: 'mean_panel_rendering',
    value9: round(meanBy(measurements, PERFORMANCE_TRACKER_MEASURES.RENDER_DURATION), 2),
  };

  reportPerformanceMetricEvent(coreServices.analytics, performanceMetricEvent);
  clearPerformanceTrackersByType(PERFORMANCE_TRACKER_TYPES.PANEL);
}
