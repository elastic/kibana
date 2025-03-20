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
import { EventData } from '../performance_context';
import { perfomanceMarkers } from '../../performance_markers';
import { DescriptionWithPrefix } from '../types';

interface PerformanceMeta {
  queryRangeSecs?: number;
  queryFromOffsetSecs?: number;
  queryToOffsetSecs?: number;
  isInitialLoad?: boolean;
  description?: DescriptionWithPrefix;
}

export function measureInteraction(pathname: string) {
  performance.mark(perfomanceMarkers.startPageChange);

  return {
    /**
     * Marks the end of the page ready state and measures the performance between the start of the page change and the end of the page ready state.
     * @param pathname - The pathname of the page.
     * @param customMetrics - Custom metrics to be included in the performance measure.
     */
    pageReady(eventData?: EventData) {
      const performanceMeta: PerformanceMeta = {};
      performance.mark(perfomanceMarkers.endPageReady);

      if (eventData?.meta?.rangeFrom && eventData?.meta?.rangeTo) {
        const { rangeFrom, rangeTo } = eventData.meta;

        // Convert the date range  to epoch timestamps (in milliseconds)
        const dateRangesInEpoch = getDateRange({
          from: rangeFrom,
          to: rangeTo,
        });

        performanceMeta.queryRangeSecs = getTimeDifferenceInSeconds(dateRangesInEpoch);
        performanceMeta.queryFromOffsetSecs =
          rangeFrom === 'now' ? 0 : getOffsetFromNowInSeconds(dateRangesInEpoch.startDate);
        performanceMeta.queryToOffsetSecs =
          rangeTo === 'now' ? 0 : getOffsetFromNowInSeconds(dateRangesInEpoch.endDate);
      }

      if (eventData?.meta?.description) {
        performanceMeta.description = eventData.meta.description;
      }

      if (
        performance.getEntriesByName(perfomanceMarkers.startPageChange).length > 0 &&
        performance.getEntriesByName(perfomanceMarkers.endPageReady).length > 0
      ) {
        performance.measure(`[ttfmp:initial] - ${pathname}`, {
          detail: {
            eventName: 'kibana:plugin_render_time',
            type: 'kibana:performance',
            customMetrics: eventData?.customMetrics,
            meta: { ...performanceMeta, isInitialLoad: true },
          },
          start: perfomanceMarkers.startPageChange,
          end: perfomanceMarkers.endPageReady,
        });

        // Clean up the marks once the measure is done
        performance.clearMarks(perfomanceMarkers.startPageChange);
        performance.clearMarks(perfomanceMarkers.endPageReady);
      }

      if (
        performance.getEntriesByName(perfomanceMarkers.startPageRefresh).length > 0 &&
        performance.getEntriesByName(perfomanceMarkers.endPageReady).length > 0
      ) {
        performance.measure(`[ttfmp:refresh] - ${pathname}`, {
          detail: {
            eventName: 'kibana:plugin_render_time',
            type: 'kibana:performance',
            customMetrics: eventData?.customMetrics,
            meta: { ...performanceMeta, isInitialLoad: false },
          },
          start: perfomanceMarkers.startPageRefresh,
          end: perfomanceMarkers.endPageReady,
        });

        // // Clean up the marks once the measure is done
        performance.clearMarks(perfomanceMarkers.startPageRefresh);
        performance.clearMarks(perfomanceMarkers.endPageReady);
      }
    },
    pageRefreshStart() {
      performance.mark(perfomanceMarkers.startPageRefresh);
    },
  };
}
