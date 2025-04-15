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

export const PERFORMANCE_TRACKER_TYPES = {
  LENS: 'Lens',
};

/**
 * PerformanceTrackerMarks are the marks that can be used to track performance
 * of lens charts. They are used to mark specific points in time during
 * the cahrt's lifecycle.
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

interface PerformanceTrackerOptions {
  type: string;
  instance: string;
}

export const createPerformanceTracker = ({ type, instance }: PerformanceTrackerOptions) => {
  const id = uuidv4();
  const createMarkName = (name: string) => `${type}:${instance}:${name}`;

  return {
    mark: (name: PerformanceTrackerMarks) =>
      performance.mark(createMarkName(name), { detail: { id } }),
  };
};

export const getPerformanceTrackersByType = (type: string) =>
  performance
    .getEntriesByType('mark')
    .filter((marker) => marker.name.startsWith(`${type}:`)) as PerformanceMark[];

export const getPerformanceTrackersGroupedById = (type: string) =>
  groupBy(getPerformanceTrackersByType(type), (marker) => marker.detail.id);

export const clearPerformanceTrackersByType = (type: string) => {
  getPerformanceTrackersByType(type).forEach((marker) => performance.clearMarks(marker.name));
};
