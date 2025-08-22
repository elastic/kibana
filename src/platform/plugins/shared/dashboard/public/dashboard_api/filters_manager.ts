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
import { apiAppliesFilters, type AppliesFilters } from '@kbn/presentation-publishing';
import deepEqual from 'fast-deep-equal';
import { BehaviorSubject, combineLatestWith, filter, map } from 'rxjs';
import type { initializeLayoutManager } from './layout_manager';
import type { initializeSettingsManager } from './settings_manager';
import type { initializeUnifiedSearchManager } from './unified_search_manager';

export const initializeFiltersManager = (
  unifiedSearchManager: ReturnType<typeof initializeUnifiedSearchManager>,
  layoutManager: ReturnType<typeof initializeLayoutManager>,
  settingsManager: ReturnType<typeof initializeSettingsManager>
) => {
  // wait until all child APIs are loaded.
  // await layoutManager.internalApi.untilAllChildrenAreAvailable();

  const childFilters$ = new BehaviorSubject<Filter[] | undefined>(undefined);
  const unpublishedChildFilters$ = new BehaviorSubject<Filter[] | undefined>(undefined);
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
  ).subscribe((allChildFilters) => unpublishedChildFilters$.next(allChildFilters));

  const publishFilters = () => {
    const published = childFilters$.getValue();
    const unpublished = unpublishedChildFilters$.getValue();
    if (!deepEqual(published, unpublished)) {
      childFilters$.next(unpublished);
      unpublishedChildFilters$.next(undefined);
    }
  };
  const autoPublishFiltersSubscription = unpublishedChildFilters$
    .pipe(
      combineLatestWith(settingsManager.api.settings.autoApplyFilters$),
      filter(([_, autoApplyFilters]) => autoApplyFilters)
    )
    .subscribe(([filters, autoApplyFilters]) => {
      publishFilters();
    });

  const filters$ = new BehaviorSubject<Filter[] | undefined>(undefined);
  filterManagerSubscription.add(
    childFilters$
      .pipe(
        combineLatestWith(unifiedSearchManager.internalApi.unifiedSearchFilters$),
        map(([childFilters, unifiedSearchFilters]) => {
          return [...(childFilters ?? []), ...(unifiedSearchFilters ?? [])];
        })
      )
      .subscribe((allFilters) => {
        filters$.next(allFilters);
      })
  );

  return {
    api: { filters$, childFilters$, unpublishedChildFilters$, publishFilters },
    cleanup: () => {
      autoPublishFiltersSubscription.unsubscribe();
      filterManagerSubscription.unsubscribe();
    },
  };
};
