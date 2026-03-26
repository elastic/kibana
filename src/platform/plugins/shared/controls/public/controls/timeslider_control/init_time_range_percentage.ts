/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject, map, merge } from 'rxjs';
import type { StateComparators } from '@kbn/presentation-publishing';
import type { TimeSlice, TimeSliderControlState } from '@kbn/controls-schemas';
import { DEFAULT_TIME_SLIDER_STATE } from '@kbn/controls-constants';
import type { TimeRangeMeta } from './get_time_range_meta';
import { FROM_INDEX, TO_INDEX } from './time_utils';

export const timeRangePercentageComparators: StateComparators<
  Pick<TimeSliderControlState, 'start_percentage_of_time_range' | 'end_percentage_of_time_range'>
> = {
  start_percentage_of_time_range: 'referenceEquality',
  end_percentage_of_time_range: 'referenceEquality',
};

export function initTimeRangePercentage(
  state: TimeSliderControlState,
  onReset: (
    timesliceStartAsPercentageOfTimeRange: TimeSliderControlState['start_percentage_of_time_range'],
    timesliceEndAsPercentageOfTimeRange: TimeSliderControlState['end_percentage_of_time_range']
  ) => void
) {
  const timesliceStartAsPercentageOfTimeRange$ = new BehaviorSubject<
    TimeSliderControlState['start_percentage_of_time_range']
  >(state.start_percentage_of_time_range);
  const timesliceEndAsPercentageOfTimeRange$ = new BehaviorSubject<
    TimeSliderControlState['end_percentage_of_time_range']
  >(state.end_percentage_of_time_range);

  return {
    setTimeRangePercentage(timeslice: TimeSlice | undefined, timeRangeMeta: TimeRangeMeta) {
      let timesliceStartAsPercentageOfTimeRange:
        | TimeSliderControlState['start_percentage_of_time_range']
        | undefined;
      let timesliceEndAsPercentageOfTimeRange:
        | TimeSliderControlState['end_percentage_of_time_range']
        | undefined;
      if (timeslice) {
        timesliceStartAsPercentageOfTimeRange = Math.max(
          (timeslice[FROM_INDEX] - timeRangeMeta.timeRangeBounds[FROM_INDEX]) /
            timeRangeMeta.timeRange,
          DEFAULT_TIME_SLIDER_STATE.start_percentage_of_time_range
        );
        timesliceEndAsPercentageOfTimeRange = Math.min(
          (timeslice[TO_INDEX] - timeRangeMeta.timeRangeBounds[FROM_INDEX]) /
            timeRangeMeta.timeRange,
          DEFAULT_TIME_SLIDER_STATE.end_percentage_of_time_range
        );
        timesliceStartAsPercentageOfTimeRange$.next(timesliceStartAsPercentageOfTimeRange);
        timesliceEndAsPercentageOfTimeRange$.next(timesliceEndAsPercentageOfTimeRange);
      }
    },
    getLatestState: () => {
      return {
        start_percentage_of_time_range: timesliceStartAsPercentageOfTimeRange$.value,
        end_percentage_of_time_range: timesliceEndAsPercentageOfTimeRange$.value,
      };
    },
    anyStateChange$: merge(
      timesliceStartAsPercentageOfTimeRange$,
      timesliceEndAsPercentageOfTimeRange$
    ).pipe(map(() => undefined)),
    reinitializeState: (lastSaved?: TimeSliderControlState) => {
      const startPercentage =
        lastSaved?.start_percentage_of_time_range ??
        DEFAULT_TIME_SLIDER_STATE.start_percentage_of_time_range;
      const endPercentage =
        lastSaved?.end_percentage_of_time_range ??
        DEFAULT_TIME_SLIDER_STATE.end_percentage_of_time_range;

      timesliceStartAsPercentageOfTimeRange$.next(startPercentage);
      timesliceEndAsPercentageOfTimeRange$.next(endPercentage);
      onReset(startPercentage, endPercentage);
    },
  };
}
