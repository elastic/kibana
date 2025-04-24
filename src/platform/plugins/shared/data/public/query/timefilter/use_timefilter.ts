/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { TimeRange, TimeState } from '@kbn/es-query';
import { BehaviorSubject, Observable, Subject, combineLatest, map, share, skip } from 'rxjs';
import { cloneDeep } from 'lodash';
import useObservable from 'react-use/lib/useObservable';
import type { Timefilter } from './timefilter';
import { getAbsoluteTimeRange } from '../../../common';
import { NowProviderInternalContract } from '../../now_provider';

type TimeStateChange = 'initial' | 'shift' | 'override';

export interface TimeStateUpdate {
  timeState: TimeState;
  kind: TimeStateChange;
}

export interface TimefilterHook {
  timeState: TimeState;
  refresh: () => void;
  timeState$: Observable<TimeStateUpdate>;
}

function materializeTimeRange(timeRange: TimeRange, forceNow: Date): TimeState {
  const asAbsolute = getAbsoluteTimeRange(timeRange, { forceNow });
  const start = new Date(asAbsolute.from);
  const end = new Date(asAbsolute.to);

  return {
    timeRange,
    start: start.getTime(),
    end: end.getTime(),
    asAbsoluteTimeRange: {
      ...asAbsolute,
      mode: 'absolute',
    },
  };
}
/**
 * Creates a useTimefilter hook that can be used in applications. Here's
 * how the hook works: any time fetch$ (from Timefilter) emits, it will
 * materialize the input time range (where it converts possibly relative
 * time ranges into an absolute time range). This is referred to as the
 * TimeState. It's both returned as state, and an observable. It also
 * exposes a refresh callback - it will simply refresh the current time
 * range. While timeFilter.setTime is memoized, refresh() is not - that
 * means that even if the time changes, timeState$ will emit a new
 * value. Additionally, the kind of change is included:
 * - 'initial' means that this is the first emitted value, based on
 * timeFilter.getTime().
 * - 'shift' means that the absolute time has changed.
 * - 'override' means that the absolute time did NOT change.
 *
 * The reason for 'override' is that quite often, consumers will use
 * the absolute timestamps (in epoch or ISO) to determine whether
 * their state needs to be recalculated (commonly an API request) - but
 * these values will not change in this case. Subscribe to state$, and
 * check for `kind == 'override'` to determine whether a manual refresh
 * is needed.
 */
export function createUseTimefilterHook(
  timefilter: Timefilter,
  nowProvider: NowProviderInternalContract
) {
  const refresh$ = new Subject<void>();

  const inputTime$ = new BehaviorSubject(timefilter.getTime());

  const timeState$ = new BehaviorSubject<TimeStateUpdate>({
    timeState: materializeTimeRange(inputTime$.value, nowProvider.get()),
    kind: 'initial',
  });

  const refresh = () => {
    refresh$.next();
  };

  combineLatest([inputTime$, refresh$])
    .pipe(
      skip(1),
      map(([range]): TimeStateUpdate => {
        const state = {
          current: timeState$.value.timeState,
          next: materializeTimeRange(range, nowProvider.get()),
        };

        const isStateChange =
          state.current.start !== state.next.start || state.current.end !== state.next.end;

        const kind: TimeStateChange = !isStateChange ? 'override' : 'shift';

        return {
          timeState: state.next,
          kind,
        };
      })
    )
    .subscribe({
      next: (value) => {
        timeState$.next(value);
      },
    });

  timefilter.getFetch$().subscribe({
    next: () => {
      inputTime$.next(cloneDeep(timefilter.getTime()));
    },
  });

  const timeStateConsumer$ = timeState$.pipe(share());

  // make sure refresh$ has emitted at least a single value,
  // otherwise combineLatest won't call
  refresh$.next();

  return function useTimefilter(): TimefilterHook {
    const { timeState } = useObservable(timeStateConsumer$, timeState$.value);

    return {
      timeState,
      refresh,
      timeState$: timeStateConsumer$,
    };
  };
}
