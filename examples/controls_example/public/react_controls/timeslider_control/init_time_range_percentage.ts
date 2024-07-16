/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { StateComparators } from '@kbn/presentation-publishing';
import { debounce } from 'lodash';
import { BehaviorSubject } from 'rxjs';
import { TimeRangeMeta } from './get_time_range_meta';
import { FROM_INDEX, TO_INDEX } from './time_utils';
import { Timeslice, TimesliderControlState } from './types';

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

  // debounce to avoid calling 'resetTimeslice' on each comparator reset
  const debouncedOnReset = debounce(() => {
    onReset(
      timesliceStartAsPercentageOfTimeRange$.value,
      timesliceEndAsPercentageOfTimeRange$.value
    );
  }, 0);

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
    serializeState: () => {
      return {
        timesliceStartAsPercentageOfTimeRange: timesliceStartAsPercentageOfTimeRange$.value,
        timesliceEndAsPercentageOfTimeRange: timesliceEndAsPercentageOfTimeRange$.value,
      };
    },
    comparators: {
      timesliceStartAsPercentageOfTimeRange: [
        timesliceStartAsPercentageOfTimeRange$,
        (value: number | undefined) => {
          timesliceStartAsPercentageOfTimeRange$.next(value);
          debouncedOnReset();
        },
      ],
      timesliceEndAsPercentageOfTimeRange: [
        timesliceEndAsPercentageOfTimeRange$,
        (value: number | undefined) => {
          timesliceEndAsPercentageOfTimeRange$.next(value);
          debouncedOnReset();
        },
      ],
    } as StateComparators<
      Pick<
        TimesliderControlState,
        'timesliceStartAsPercentageOfTimeRange' | 'timesliceEndAsPercentageOfTimeRange'
      >
    >,
  };
}
