/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { BehaviorSubject } from 'rxjs';
import fastIsEqual from 'fast-deep-equal';
import { TimeRange } from '@kbn/es-query';
import { StateComparators } from '../../comparators';
import { PublishesWritableTimeRange } from './publishes_unified_search';

export interface SerializedTimeRange {
  timeRange?: TimeRange | undefined;
}

export const initializeTimeRange = (
  rawState: SerializedTimeRange
): {
  serialize: () => SerializedTimeRange;
  api: PublishesWritableTimeRange;
  comparators: StateComparators<SerializedTimeRange>;
} => {
  const timeRange$ = new BehaviorSubject<TimeRange | undefined>(rawState.timeRange);
  function setTimeRange(nextTimeRange: TimeRange | undefined) {
    timeRange$.next(nextTimeRange);
  }

  return {
    serialize: () => ({
      timeRange: timeRange$.value,
    }),
    comparators: {
      timeRange: [timeRange$, setTimeRange, fastIsEqual],
    } as StateComparators<SerializedTimeRange>,
    api: {
      timeRange$,
      setTimeRange,
    },
  };
};
