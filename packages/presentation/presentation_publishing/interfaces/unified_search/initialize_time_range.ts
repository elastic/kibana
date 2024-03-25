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
import { PublishingSubject } from '../../publishing_subject';
import { StateComparators } from '../../comparators';
import {
  apiPublishesTimeRange,
  PublishesTimeRange,
  PublishesWritableTimeRange,
} from './publishes_unified_search';

export interface SerializedTimeRange {
  timeRange: TimeRange | undefined;
}

export const initializeTimeRange = (
  rawState: SerializedTimeRange,
  parentApi?: unknown
): {
  appliedTimeRange$: PublishingSubject<TimeRange | undefined>;
  cleanupTimeRange: () => void;
  serializeTimeRange: () => SerializedTimeRange;
  timeRangeApi: PublishesWritableTimeRange;
  timeRangeComparators: StateComparators<SerializedTimeRange>;
} => {
  const timeRange$ = new BehaviorSubject<TimeRange | undefined>(rawState.timeRange);
  function setTimeRange(nextTimeRange: TimeRange | undefined) {
    timeRange$.next(nextTimeRange);
  }
  const appliedTimeRange$ = new BehaviorSubject(
    timeRange$.value ?? (parentApi as Partial<PublishesTimeRange>)?.timeRange$?.value
  );

  const subscriptions = timeRange$.subscribe((timeRange) => {
    appliedTimeRange$.next(
      timeRange ?? (parentApi as Partial<PublishesTimeRange>)?.timeRange$?.value
    );
  });
  if (apiPublishesTimeRange(parentApi)) {
    subscriptions.add(
      parentApi?.timeRange$.subscribe((parentTimeRange) => {
        if (timeRange$?.value) {
          return;
        }
        appliedTimeRange$.next(parentTimeRange);
      })
    );
  }

  return {
    appliedTimeRange$,
    cleanupTimeRange: () => {
      subscriptions.unsubscribe();
    },
    serializeTimeRange: () => ({
      timeRange: timeRange$.value,
    }),
    timeRangeComparators: {
      timeRange: [timeRange$, setTimeRange, fastIsEqual],
    } as StateComparators<SerializedTimeRange>,
    timeRangeApi: {
      timeRange$,
      setTimeRange,
    },
  };
};
