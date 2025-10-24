/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Filter } from '@kbn/es-query';
import type { ESQLControlVariable } from '@kbn/esql-types';
import { BehaviorSubject, combineLatest, from, startWith } from 'rxjs';
import type { initializeComposableFetchContextManager } from './composable_fetch_context_manager';
import type { initializeControlGroupManager } from './control_group_manager';
import type { initializeUnifiedSearchManager } from './unified_search_manager';

export const initializeFetchContextCombiner = ({
  unifiedSearchManager,
  controlGroupManager,
  composableFetchContextManager,
}: {
  unifiedSearchManager: ReturnType<typeof initializeUnifiedSearchManager>;
  controlGroupManager: ReturnType<typeof initializeControlGroupManager>;
  composableFetchContextManager: ReturnType<typeof initializeComposableFetchContextManager>;
}) => {
  const filters$ = new BehaviorSubject<Filter[] | undefined>(undefined);
  const timeslice$ = new BehaviorSubject<[number, number] | undefined>(undefined);
  const esqlVariables$ = new BehaviorSubject<ESQLControlVariable[] | undefined>(undefined);

  const filtersSubscription = combineLatest([
    unifiedSearchManager.internalApi.unifiedSearchFilters$,
    controlGroupManager.internalApi.controlGroupFilters$,
    composableFetchContextManager.internalApi.composedFilters$,
  ]).subscribe(([unifiedSearchFilters, controlGroupFilters, composableFilters]) => {
    filters$.next([
      ...(composableFilters ?? []),
      ...(unifiedSearchFilters ?? []),
      ...(controlGroupFilters ?? []),
    ]);
  });

  const variablesSubscription = combineLatest([
    controlGroupManager.internalApi.controlGroupEsqlVariables$,
    composableFetchContextManager.internalApi.composedVariables$,
  ]).subscribe(([controlGroupVariables, composableVariables]) => {
    esqlVariables$.next([...(controlGroupVariables ?? []), ...(composableVariables ?? [])]);
  });

  const timesliceSubscription = combineLatest([
    controlGroupManager.internalApi.controlGroupTimeslice$,
    composableFetchContextManager.internalApi.composedTimeslice$,
  ]).subscribe(([controlGroupTimeslice, composableTimeSlice]) => {
    timeslice$.next(controlGroupTimeslice ?? composableTimeSlice);
  });

  // --------------------------------------------------------------------------------------
  // Pause Dashboard fetching until all initial fetch context is available
  // --------------------------------------------------------------------------------------
  const unPauseWhenInitialFetchContextIsReady = async () => {
    await Promise.all([
      composableFetchContextManager.internalApi.initialFetchContextReady,
      controlGroupManager.internalApi.untilControlsInitialized(),
    ]);
    return false;
  };
  const isFetchPaused$ = from(unPauseWhenInitialFetchContextIsReady()).pipe(startWith(true));

  return {
    api: {
      filters$,
      timeslice$,
      esqlVariables$,
      isFetchPaused$,
    },
    cleanup: () => {
      filtersSubscription.unsubscribe();
      variablesSubscription.unsubscribe();
      timesliceSubscription.unsubscribe();
    },
  };
};
