/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject, map, merge } from 'rxjs';
import { StateComparators } from '@kbn/presentation-publishing';
import { TimeRangeMeta } from './get_time_range_meta';
import { FROM_INDEX, TO_INDEX } from './time_utils';
import { Timeslice, TimesliderControlState } from './types';

export const timeRangePercentageComparators: StateComparators<
  Pick<
    TimesliderControlState,
    'timesliceStartAsPercentageOfTimeRange' | 'timesliceEndAsPercentageOfTimeRange'
  >
> = {
  timesliceStartAsPercentageOfTimeRange: 'referenceEquality',
  timesliceEndAsPercentageOfTimeRange: 'referenceEquality',
};

export function initTimeRangePercentage(
  state: TimesliderControlState,
  onReset: (
    timesliceStartAsPercentageOfTimeRange: number | undefined,
    timesliceEndAsPercentageOfTimeRange: number | undefined
  ) => void
) {
  const timesliceStartAsPercentageOfTimeRange$ = new BehaviorSubject<number | undefined>(
    state.timesliceStartAsPercentageOfTimeRange
  );
  const timesliceEndAsPercentageOfTimeRange$ = new BehaviorSubject<number | undefined>(
    state.timesliceEndAsPercentageOfTimeRange
  );

  return {
    setTimeRangePercentage(timeslice: Timeslice | undefined, timeRangeMeta: TimeRangeMeta) {
      let timesliceStartAsPercentageOfTimeRange: number | undefined;
      let timesliceEndAsPercentageOfTimeRange: number | undefined;
      if (timeslice) {
        timesliceStartAsPercentageOfTimeRange =
          (timeslice[FROM_INDEX] - timeRangeMeta.timeRangeBounds[FROM_INDEX]) /
          timeRangeMeta.timeRange;
        timesliceEndAsPercentageOfTimeRange =
          (timeslice[TO_INDEX] - timeRangeMeta.timeRangeBounds[FROM_INDEX]) /
          timeRangeMeta.timeRange;
      }
      timesliceStartAsPercentageOfTimeRange$.next(timesliceStartAsPercentageOfTimeRange);
      timesliceEndAsPercentageOfTimeRange$.next(timesliceEndAsPercentageOfTimeRange);
    },
    getLatestState: () => {
      return {
        timesliceStartAsPercentageOfTimeRange: timesliceStartAsPercentageOfTimeRange$.value,
        timesliceEndAsPercentageOfTimeRange: timesliceEndAsPercentageOfTimeRange$.value,
      };
    },
    anyStateChange$: merge(
      timesliceStartAsPercentageOfTimeRange$,
      timesliceEndAsPercentageOfTimeRange$
    ).pipe(map(() => undefined)),
    reinitializeState: (lastSaved?: TimesliderControlState) => {
      timesliceStartAsPercentageOfTimeRange$.next(lastSaved?.timesliceStartAsPercentageOfTimeRange);
      timesliceEndAsPercentageOfTimeRange$.next(lastSaved?.timesliceEndAsPercentageOfTimeRange);
      onReset(
        lastSaved?.timesliceStartAsPercentageOfTimeRange,
        lastSaved?.timesliceEndAsPercentageOfTimeRange
      );
    },
  };
}
