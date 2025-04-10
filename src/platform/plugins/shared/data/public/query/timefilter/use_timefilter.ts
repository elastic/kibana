/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { TimeRange, TimeState } from '@kbn/es-query';
import { BehaviorSubject, Observable, Subject, forkJoin, map, share } from 'rxjs';
import { cloneDeep } from 'lodash';
import useObservable from 'react-use/lib/useObservable';
import type { Timefilter } from './timefilter';
import { getAbsoluteTimeRange } from '../../../common';

interface TimeStateUpdate {
  timeState: TimeState;
  refresh: 'shift' | 'override' | 'none';
}

export interface TimefilterHook {
  timeState: TimeState;
  refresh: () => void;
  fetch$: Observable<TimeStateUpdate>;
}

function materializeTimeRange(timeRange: TimeRange): TimeState {
  const asAbsolute = getAbsoluteTimeRange(timeRange);
  const start = new Date(timeRange.from);
  const end = new Date(timeRange.to);

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

export function createUseTimefilterHook(timefilter: Timefilter) {
  const initialTimeRange = timefilter.getTime();

  const refresh$ = new Subject<boolean>();

  const currentTime$ = new BehaviorSubject(initialTimeRange);

  const timeState$ = new BehaviorSubject<TimeStateUpdate>({
    timeState: materializeTimeRange(initialTimeRange),
    refresh: 'shift' as const,
  });

  forkJoin([currentTime$, refresh$])
    .pipe(
      map(([range, fromRefresh]): TimeStateUpdate => {
        const next = materializeTimeRange(getAbsoluteTimeRange(range));
        const current = timeState$.value.timeState;

        let refresh: TimeStateUpdate['refresh'] = fromRefresh ? 'override' : 'none';

        if (current.start !== next.start || current.end !== next.end) {
          refresh = 'shift';
        }

        return {
          timeState: next,
          refresh,
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
      currentTime$.next(cloneDeep(currentTime$.value));
    },
  });

  const timeStateConsumer$ = timeState$.pipe(share());

  const refresh = () => {
    refresh$.next(true);
  };

  return function useTimefilter(): TimefilterHook {
    const { timeState } = useObservable(timeStateConsumer$, timeState$.value);

    return {
      timeState,
      refresh,
      fetch$: timeStateConsumer$,
    };
  };
}
