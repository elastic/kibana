/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { max, median, min } from 'd3-array';
import { spanMillis } from '../shared/time_span';
import type { QueryProfileTimeline, TimelineDriver, TimeSpan } from '../profile/types';

/** The kinds of driver in the order a query runs them. Any other kind is listed after these. */
const GROUP_ORDER = ['data', 'node_reduce', 'final'];

/** The narrowest a span is drawn, as a percentage of the track, so a very short one stays visible. */
const MIN_LANE_WIDTH_PERCENT = 1.5;

/** Where a span sits on a track, as percentages of the track. */
export interface LaneBox {
  left: number;
  width: number;
}

/** The time range that holds planning and every driver. */
export const fullDomain = (timeline: QueryProfileTimeline): TimeSpan => {
  const spans = [...(timeline.planning ? [timeline.planning] : []), ...timeline.drivers];
  return {
    startMillis: Math.min(...spans.map((span) => span.startMillis)),
    stopMillis: Math.max(...spans.map((span) => span.stopMillis)),
  };
};

/** Places a span on a track as percentages. */
export const laneBox = (startMillis: number, stopMillis: number, domain: TimeSpan): LaneBox => {
  const length = domain.stopMillis - domain.startMillis;
  if (length <= 0) {
    return { left: 0, width: 100 };
  }
  const width = Math.min(
    100,
    Math.max(((stopMillis - startMillis) / length) * 100, MIN_LANE_WIDTH_PERCENT)
  );
  const left = Math.min(
    Math.max(((startMillis - domain.startMillis) / length) * 100, 0),
    100 - width
  );
  return { left, width };
};

/** Groups drivers by what they do, in the order a query runs them. */
export const groupDrivers = (drivers: TimelineDriver[]): Array<[string, TimelineDriver[]]> => {
  const groups = new Map<string, TimelineDriver[]>();
  drivers.forEach((driver) => {
    const group = groups.get(driver.description);
    if (group) {
      group.push(driver);
    } else {
      groups.set(driver.description, [driver]);
    }
  });
  const known = GROUP_ORDER.filter((description) => groups.has(description));
  const rest = [...groups.keys()].filter((description) => !GROUP_ORDER.includes(description));
  return [...known, ...rest].map((description) => [description, groups.get(description) ?? []]);
};

/** A group is skewed when its slowest driver takes at least this many times the median. */
const SKEW_RATIO = 2;

/** At least this many drivers are needed to call one of them an outlier. */
const MIN_DRIVERS_FOR_SKEW = 3;

/** How much the durations of drivers that do the same work differ. */
export interface DriverSpread {
  count: number;
  minMillis: number;
  medianMillis: number;
  maxMillis: number;
  /** The slowest driver takes much longer than the typical one. */
  isSkewed: boolean;
}

/** The spread of the durations of a group of drivers, or nothing when there is one driver only. */
export const driverSpread = (drivers: TimelineDriver[]): DriverSpread | undefined => {
  if (drivers.length < 2) {
    return undefined;
  }
  const durations = drivers.map(spanMillis);
  const minMillis = min(durations) ?? 0;
  const medianMillis = median(durations) ?? 0;
  const maxMillis = max(durations) ?? 0;

  return {
    count: durations.length,
    minMillis,
    medianMillis,
    maxMillis,
    isSkewed:
      durations.length >= MIN_DRIVERS_FOR_SKEW &&
      medianMillis > 0 &&
      maxMillis >= medianMillis * SKEW_RATIO,
  };
};
