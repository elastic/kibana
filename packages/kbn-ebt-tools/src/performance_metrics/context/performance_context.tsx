/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useMemo, useState } from 'react';
import { afterFrame } from '@elastic/apm-rum-core';
import { useLocation } from 'react-router-dom';
import { perfomanceMarkers } from '../performance_markers';
import { PerformanceApi, PerformanceContext } from './use_performance_context';
import { PerformanceMetricEvent } from '../../performance_metric_events';

export type CustomMetrics = Omit<PerformanceMetricEvent, 'eventName' | 'meta' | 'duration'>;

function measureInteraction() {
  performance.mark(perfomanceMarkers.startPageChange);
  const trackedRoutes: string[] = [];
  return {
    /**
     * Marks the end of the page ready state and measures the performance between the start of the page change and the end of the page ready state.
     * @param pathname - The pathname of the page.
     * @param customMetrics - Custom metrics to be included in the performance measure.
     */
    pageReady(pathname: string, customMetrics?: CustomMetrics) {
      performance.mark(perfomanceMarkers.endPageReady);

      if (!trackedRoutes.includes(pathname)) {
        performance.measure(pathname, {
          detail: {
            eventName: 'kibana:plugin_render_time',
            type: 'kibana:performance',
            customMetrics,
          },
          start: perfomanceMarkers.startPageChange,
          end: perfomanceMarkers.endPageReady,
        });
        trackedRoutes.push(pathname);
      }
    },
  };
}

export function PerformanceContextProvider({ children }: { children: React.ReactElement }) {
  const [isRendered, setIsRendered] = useState(false);
  const location = useLocation();
  const interaction = measureInteraction();

  React.useEffect(() => {
    afterFrame(() => {
      setIsRendered(true);
    });
    return () => {
      setIsRendered(false);
      performance.clearMeasures(location.pathname);
    };
  }, [location.pathname]);

  const api = useMemo<PerformanceApi>(
    () => ({
      onPageReady(customMetrics) {
        if (isRendered) {
          interaction.pageReady(location.pathname, customMetrics);
        }
      },
    }),
    [isRendered, location.pathname, interaction]
  );

  return <PerformanceContext.Provider value={api}>{children}</PerformanceContext.Provider>;
}
// dynamic import
// eslint-disable-next-line import/no-default-export
export default PerformanceContextProvider;
