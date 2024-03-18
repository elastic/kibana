/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PhaseEvent } from '@kbn/presentation-publishing';
import { useCallback, useRef } from 'react';

import { useDashboardContainer } from '../../embeddable/dashboard_container';
import { DashboardLoadedEventStatus, DashboardRenderPerformanceStats } from '../../types';

type DashboardRenderPerformanceTracker = DashboardRenderPerformanceStats & {
  panelIds: Record<string, Record<string, number>>;
  status: DashboardLoadedEventStatus;
  doneCount: number;
};

const getDefaultPerformanceTracker: () => DashboardRenderPerformanceTracker = () => ({
  panelsRenderStartTime: performance.now(),
  panelsRenderDoneTime: 0,
  lastTimeToData: 0,

  panelIds: {},
  doneCount: 0,
  status: 'done',
});

export const useDashboardPerformanceTracker = ({ panelCount }: { panelCount: number }) => {
  const dashboard = useDashboardContainer();

  // reset performance tracker on each render.
  const performanceRefs = useRef<DashboardRenderPerformanceTracker>(getDefaultPerformanceTracker());
  performanceRefs.current = getDefaultPerformanceTracker();

  const onPanelStatusChange = useCallback(
    (info: PhaseEvent) => {
      if (performanceRefs.current.panelIds[info.id] === undefined || info.status === 'loading') {
        performanceRefs.current.panelIds[info.id] = {};
      } else if (info.status === 'error') {
        performanceRefs.current.status = 'error';
      } else if (info.status === 'loaded') {
        performanceRefs.current.lastTimeToData = performance.now();
      }

      performanceRefs.current.panelIds[info.id][info.status] = performance.now();

      if (info.status === 'error' || info.status === 'rendered') {
        performanceRefs.current.doneCount++;
        if (performanceRefs.current.doneCount === panelCount) {
          performanceRefs.current.panelsRenderDoneTime = performance.now();
          dashboard.reportPerformanceMetrics(performanceRefs.current);
        }
      }
    },
    [dashboard, panelCount]
  );

  return { onPanelStatusChange };
};
