/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiRangeTick } from '@elastic/eui';
import { TimeRange } from '@kbn/es-query';
import {
  FROM_INDEX,
  getStepSize,
  getTicks,
  roundDownToNextStepSizeFactor,
  roundUpToNextStepSizeFactor,
  TO_INDEX,
} from './time_utils';
import { Services } from './types';

export interface TimeRangeMeta {
  format: string;
  stepSize: number;
  ticks: EuiRangeTick[];
  timeRange: number;
  timeRangeBounds: [number, number];
  timeRangeMax: number;
  timeRangeMin: number;
}

export function getTimeRangeMeta(
  timeRange: TimeRange | undefined,
  services: Services
): TimeRangeMeta {
  const nextBounds = timeRangeToBounds(timeRange ?? getDefaultTimeRange(services), services);
  const ticks = getTicks(nextBounds[FROM_INDEX], nextBounds[TO_INDEX], getTimezone(services));
  const { format, stepSize } = getStepSize(ticks);
  return {
    format,
    stepSize,
    ticks,
    timeRange: nextBounds[TO_INDEX] - nextBounds[FROM_INDEX],
    timeRangeBounds: nextBounds,
    timeRangeMax: roundUpToNextStepSizeFactor(nextBounds[TO_INDEX], stepSize),
    timeRangeMin: roundDownToNextStepSizeFactor(nextBounds[FROM_INDEX], stepSize),
  };
}

export function getTimezone(services: Services) {
  return services.core.uiSettings.get('dateFormat:tz', 'Browser');
}

function getDefaultTimeRange(services: Services) {
  const defaultTimeRange = services.core.uiSettings.get('timepicker:timeDefaults');
  return defaultTimeRange ? defaultTimeRange : { from: 'now-15m', to: 'now' };
}

function timeRangeToBounds(timeRange: TimeRange, services: Services): [number, number] {
  const timeRangeBounds = services.data.query.timefilter.timefilter.calculateBounds(timeRange);
  return timeRangeBounds.min === undefined || timeRangeBounds.max === undefined
    ? [Date.now() - 1000 * 60 * 15, Date.now()]
    : [timeRangeBounds.min.valueOf(), timeRangeBounds.max.valueOf()];
}
