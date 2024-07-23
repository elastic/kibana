/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { BehaviorSubject, combineLatest, map, Subscription } from 'rxjs';
import deepEqual from 'fast-deep-equal';
import { Filter } from '@kbn/es-query';
import { combineCompatibleChildrenApis } from '@kbn/presentation-containers';
import {
  apiPublishesFilters,
  apiPublishesTimeslice,
  PublishesFilters,
  PublishesTimeslice,
} from '@kbn/presentation-publishing';
import { ControlGroupApi } from './types';

export function initSelectionsManager(
  controlGroupApi: Pick<ControlGroupApi, 'children$' | 'untilInitialized'>
) {
  const filters$ = new BehaviorSubject<Filter[] | undefined>([]);
  const unpublishedFilters$ = new BehaviorSubject<Filter[] | undefined>([]);
  const hasUnpublishedFilters$ = new BehaviorSubject(false);
  const timeslice$ = new BehaviorSubject<[number, number] | undefined>(undefined);
  const unpublishedTimeslice$ = new BehaviorSubject<[number, number] | undefined>(undefined);
  const hasUnpublishedTimeslice$ = new BehaviorSubject(false);

  const subscriptions: Subscription[] = [];
  controlGroupApi.untilInitialized().then(() => {
    const initialFilters: Filter[] = [];
    let initialTimeslice: undefined | [number, number];
    Object.values(controlGroupApi.children$.value).forEach((controlApi) => {
      if (apiPublishesFilters(controlApi) && controlApi.filters$.value) {
        initialFilters.push(...controlApi.filters$.value);
      }
      if (apiPublishesTimeslice(controlApi) && controlApi.timeslice$.value) {
        initialTimeslice = controlApi.timeslice$.value;
      }
    });
    if (initialFilters.length) {
      filters$.next(initialFilters);
      unpublishedFilters$.next(initialFilters);
    }
    if (initialTimeslice) {
      timeslice$.next(initialTimeslice);
      unpublishedTimeslice$.next(initialTimeslice);
    }

    subscriptions.push(
      combineCompatibleChildrenApis<PublishesFilters, Filter[]>(
        controlGroupApi,
        'filters$',
        apiPublishesFilters,
        []
      ).subscribe((newFilters) => unpublishedFilters$.next(newFilters))
    );

    subscriptions.push(
      combineCompatibleChildrenApis<PublishesTimeslice, [number, number] | undefined>(
        controlGroupApi,
        'timeslice$',
        apiPublishesTimeslice,
        undefined,
        // flatten method
        (values) => {
          // control group should never allow multiple timeslider controls
          // return last timeslider control value
          return values.length === 0 ? undefined : values[values.length - 1];
        }
      ).subscribe((newTimeslice) => unpublishedTimeslice$.next(newTimeslice))
    );

    subscriptions.push(combineLatest([filters$, unpublishedFilters$]).subscribe(([filters, unpublishedFilters]) => {
      hasUnpublishedFilters$.next(!deepEqual(filters, unpublishedFilters));
    }));

    subscriptions.push(combineLatest([timeslice$, unpublishedTimeslice$]).subscribe(([timeslice, unpublishedTimeslice]) => {
      hasUnpublishedTimeslice$.next(!deepEqual(timeslice, unpublishedTimeslice));
    }));
  });

  function applySelections() {
    if (hasUnpublishedFilters$.value) {
      filters$.next(unpublishedFilters$.value);
    }
    if (hasUnpublishedTimeslice$.value) {
      timeslice$.next(unpublishedTimeslice$.value);
    }
  }

  return {
    api: {
      filters$,
      timeslice$,
    },
    applySelections,
    cleanup: () => {
      subscriptions.forEach((subscription) => subscription.unsubscribe());
    },
    hasUnappliedSelections$: combineLatest([hasUnpublishedFilters$, hasUnpublishedTimeslice$]).pipe(
      map(
        ([hasUnpublishedFilters, hasUnpublishedTimeslice]) =>
          hasUnpublishedFilters || hasUnpublishedTimeslice
      )
    ),
  };
}
