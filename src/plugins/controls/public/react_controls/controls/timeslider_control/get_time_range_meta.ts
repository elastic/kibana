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
import { coreServices, dataService } from '../../../services/kibana_services';
import {
  FROM_INDEX,
  getStepSize,
  getTicks,
  roundDownToNextStepSizeFactor,
  roundUpToNextStepSizeFactor,
  TO_INDEX,
} from './time_utils';

export interface TimeRangeMeta {
  format: string;
  stepSize: number;
  ticks: EuiRangeTick[];
  timeRange: number;
  timeRangeBounds: [number, number];
  timeRangeMax: number;
  timeRangeMin: number;
}

export function getTimeRangeMeta(timeRange: TimeRange | undefined): TimeRangeMeta {
  const nextBounds = timeRangeToBounds(timeRange ?? getDefaultTimeRange());
  const ticks = getTicks(nextBounds[FROM_INDEX], nextBounds[TO_INDEX], getTimezone());
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

export function getTimezone() {
  return coreServices.uiSettings.get('dateFormat:tz', 'Browser');
}

function getDefaultTimeRange() {
  const defaultTimeRange = coreServices.uiSettings.get('timepicker:timeDefaults');
  return defaultTimeRange ? defaultTimeRange : { from: 'now-15m', to: 'now' };
}

function timeRangeToBounds(timeRange: TimeRange): [number, number] {
  const timeRangeBounds = dataService.query.timefilter.timefilter.calculateBounds(timeRange);
  return timeRangeBounds.min === undefined || timeRangeBounds.max === undefined
    ? [Date.now() - 1000 * 60 * 15, Date.now()]
    : [timeRangeBounds.min.valueOf(), timeRangeBounds.max.valueOf()];
}
