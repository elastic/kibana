/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { isoToEpochRt, decodeOrThrow } from '@kbn/io-ts-utils';
import * as rt from 'io-ts';
import React, { useMemo, useState } from 'react';
import { afterFrame } from '@elastic/apm-rum-core';
import { useLocation } from 'react-router-dom';
import { perfomanceMarkers } from '../performance_markers';
import { PerformanceApi, PerformanceContext } from './use_performance_context';
import { PerformanceMetricEvent } from '../../performance_metric_events';

export type CustomMetrics = Omit<PerformanceMetricEvent, 'eventName' | 'meta' | 'duration'>;

export const metaRt = rt.type({
  rangeFrom: isoToEpochRt,
  rangeTo: isoToEpochRt,
});

export type Meta = rt.TypeOf<typeof metaRt>;

export interface EventData {
  customMetrics?: CustomMetrics;
  meta?: Meta;
}

function measureInteraction() {
  performance.mark(perfomanceMarkers.startPageChange);
  const trackedRoutes: string[] = [];
  return {
    /**
     * Marks the end of the page ready state and measures the performance between the start of the page change and the end of the page ready state.
     * @param pathname - The pathname of the page.
     * @param customMetrics - Custom metrics to be included in the performance measure.
     */
    pageReady(pathname: string, eventData?: EventData) {
      let decodedMeta: Meta | undefined;
      performance.mark(perfomanceMarkers.endPageReady);

      if (eventData?.meta) {
        decodedMeta = decodeOrThrow(
          metaRt,
          (message: string) => new Error(`Failed to decode meta type: ${message}`)
        )(eventData?.meta);
      }

      if (!trackedRoutes.includes(pathname)) {
        performance.measure(pathname, {
          detail: {
            eventName: 'kibana:plugin_render_time',
            type: 'kibana:performance',
            customMetrics: eventData?.customMetrics,
            meta: decodedMeta,
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
      onPageReady(eventData) {
        if (isRendered) {
          interaction.pageReady(location.pathname, eventData);
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
