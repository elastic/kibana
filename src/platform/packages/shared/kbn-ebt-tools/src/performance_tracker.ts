/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { v4 as uuidv4 } from 'uuid';
import { groupBy } from 'lodash';

import type { Logger } from '@kbn/logging';

/**
 * PERFORMANCE_TRACKER_TYPES defines top-level categories to be use as
 * the mark name. They are used to group marks and measures by type.
 */
export const PERFORMANCE_TRACKER_TYPES = {
  PANEL: 'Panel',
} as const;
export type PerformanceTrackerTypes =
  (typeof PERFORMANCE_TRACKER_TYPES)[keyof typeof PERFORMANCE_TRACKER_TYPES];

/**
 * PerformanceTrackerMarks are the marks that can be used to track performance
 * of lens charts. They are used to mark specific points in time during
 * the chart's lifecycle.
 */
export const PERFORMANCE_TRACKER_MARKS = {
  /**
   * Mark that indicates the start of everything before the rendering process.
   */
  PRE_RENDER: 'preRender',
  /**
   * Mark that indicates the start of the rendering process.
   * Should be used right before returning the chart's JSX.
   */
  RENDER_START: 'renderStart',
  /**
   * Mark that indicates the end of the rendering process.
   * Should be used at the beginning of the `renderComplete` callback.
   */
  RENDER_COMPLETE: 'renderComplete',
} as const;
export type PerformanceTrackerMarks =
  (typeof PERFORMANCE_TRACKER_MARKS)[keyof typeof PERFORMANCE_TRACKER_MARKS];

export const PERFORMANCE_TRACKER_MEASURES = {
  PRE_RENDER_DURATION: 'preRenderDuration',
  RENDER_DURATION: 'renderDuration',
} as const;
export type PerformanceTrackerMeasures =
  (typeof PERFORMANCE_TRACKER_MEASURES)[keyof typeof PERFORMANCE_TRACKER_MEASURES];

/**
 * Options to create a performance tracker.
 */
interface PerformanceTrackerOptions {
  /**
   * High-level type of the performance tracker, for example "Lens".
   */
  type: PerformanceTrackerTypes;
  /**
   * Instance of the performance tracker type, for example "xyVis".
   * This is used to group marks and measures by instance.
   */
  instance: string;
  /**
   * Optional logger.
   */
  logger?: Logger;
}

/**
 * Creates a performance tracker to mark and measure performance events.
 * @param options.type - High-level type of the performance tracker, for example "Lens".
 * @param options.instance - Instance of the performance tracker type, for example "xyVis".
 * @returns A performance tracker object with a mark method.
 */
export const createPerformanceTracker = ({ type, instance, logger }: PerformanceTrackerOptions) => {
  const id = uuidv4();
  const createMarkName = (name: string) => `${type}:${instance}:${name}`;

  return {
    /**
     * Creates a performance mark with the given name.
     * @param name - The name of the mark to create, will be postfixed.
     * @returns The created performance mark
     */
    mark: (name: PerformanceTrackerMarks) => {
      try {
        performance.mark(createMarkName(name), { detail: { id } });
      } catch (error) {
        logger?.error('Error creating performance mark:', error);
      }
    },
  };
};

/**
 * Get all performance trackers by type.
 * @param type - High-level type of the performance tracker, for example "Lens".
 */
export const getPerformanceTrackersByType = (type: PerformanceTrackerTypes) => {
  try {
    return performance
      .getEntriesByType('mark')
      .filter((marker) => marker.name.startsWith(`${type}:`)) as PerformanceMark[];
  } catch (e) {
    // Fail silently if performance API is not supported.
    return [];
  }
};

/**
 * Get all performance trackers grouped by id.
 * @param type - High-level type of the performance tracker, for example "Lens".
 * @returns A map of performance trackers grouped by id.
 */
export const getPerformanceTrackersGroupedById = (type: PerformanceTrackerTypes) => {
  try {
    return groupBy(getPerformanceTrackersByType(type), (marker) => marker.detail?.id);
  } catch (e) {
    // Fail silently if performance API is not supported.
    return {};
  }
};

/**
 * Clear all performance trackers by type.
 * @param type - High-level type of the performance tracker, for example "Lens".
 */
export const clearPerformanceTrackersByType = (type: PerformanceTrackerTypes) => {
  try {
    getPerformanceTrackersByType(type).forEach((marker) => performance.clearMarks(marker.name));
  } catch (e) {
    // Fail silently if performance API is not supported.
  }
};
