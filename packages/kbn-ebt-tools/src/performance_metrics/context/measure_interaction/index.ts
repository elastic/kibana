/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  getDateRange,
  getOffsetFromNowInSeconds,
  getTimeDifferenceInSeconds,
} from '@kbn/timerange';
import { perfomanceMarkers } from '../../performance_markers';
import { EventData } from '../performance_context';

interface PerformanceMeta {
  queryRangeSecs: number;
  queryOffsetSecs: number;
}

export function measureInteraction() {
  performance.mark(perfomanceMarkers.startPageChange);
  const trackedRoutes: string[] = [];
  return {
    /**
     * Marks the end of the page ready state and measures the performance between the start of the page change and the end of the page ready state.
     * @param pathname - The pathname of the page.
     * @param customMetrics - Custom metrics to be included in the performance measure.
     */
    pageReady(pathname: string, eventData?: EventData) {
      let performanceMeta: PerformanceMeta | undefined;
      performance.mark(perfomanceMarkers.endPageReady);

      if (eventData?.meta) {
        const { rangeFrom, rangeTo } = eventData.meta;

        // Convert the date range  to epoch timestamps (in milliseconds)
        const dateRangesInEpoch = getDateRange({
          from: rangeFrom,
          to: rangeTo,
        });

        performanceMeta = {
          queryRangeSecs: getTimeDifferenceInSeconds(dateRangesInEpoch),
          queryOffsetSecs:
            rangeTo === 'now' ? 0 : getOffsetFromNowInSeconds(dateRangesInEpoch.endDate),
        };
      }

      if (!trackedRoutes.includes(pathname)) {
        performance.measure(pathname, {
          detail: {
            eventName: 'kibana:plugin_render_time',
            type: 'kibana:performance',
            customMetrics: eventData?.customMetrics,
            meta: performanceMeta,
          },
          start: perfomanceMarkers.startPageChange,
          end: perfomanceMarkers.endPageReady,
        });
        trackedRoutes.push(pathname);
      }
    },
  };
}
