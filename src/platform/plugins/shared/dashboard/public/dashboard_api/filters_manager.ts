/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Filter } from '@kbn/es-query';
import { combineCompatibleChildrenApis } from '@kbn/presentation-containers';
import { apiAppliesFilters, AppliesFilters } from '@kbn/presentation-publishing';
import { BehaviorSubject, combineLatestWith, map } from 'rxjs';
import { initializeUnifiedSearchManager } from './unified_search_manager';
import { initializeLayoutManager } from './layout_manager';

export const initializeFiltersManager = (
  unifiedSearchManager: ReturnType<typeof initializeUnifiedSearchManager>,
  layoutManager: ReturnType<typeof initializeLayoutManager>
) => {
  // wait until all child APIs are loaded.
  // await layoutManager.internalApi.untilAllChildrenAreAvailable();

  const childFilters$ = new BehaviorSubject<Filter[] | undefined>(undefined);
  const filterManagerSubscription = combineCompatibleChildrenApis<
    AppliesFilters,
    Filter[] | undefined
  >(
    { children$: layoutManager.api.children$ },
    'appliedFilters$',
    apiAppliesFilters,
    [],
    (values) => {
      const allOutputFilters = values.filter(
        (childOutputFilters) => childOutputFilters && childOutputFilters.length > 0
      ) as Filter[][];
      return allOutputFilters && allOutputFilters.length > 0 ? allOutputFilters.flat() : undefined;
    }
  ).subscribe((allChildFilters) => childFilters$.next(allChildFilters));

  const filters$ = new BehaviorSubject<Filter[] | undefined>(undefined);
  filterManagerSubscription.add(
    childFilters$
      .pipe(
        combineLatestWith(unifiedSearchManager.internalApi.unifiedSearchFilters$),
        map(([childFilters, unifiedSearchFilters]) => {
          return [...(childFilters ?? []), ...(unifiedSearchFilters ?? [])];
        })
      )
      .subscribe((allFilters) => filters$.next(allFilters))
  );

  return {
    api: { filters$ },
    cleanup: () => filterManagerSubscription.unsubscribe(),
  };
};
