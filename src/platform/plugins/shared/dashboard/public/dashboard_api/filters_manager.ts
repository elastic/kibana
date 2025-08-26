/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import deepEqual from 'fast-deep-equal';
import {
  BehaviorSubject,
  combineLatest,
  combineLatestWith,
  debounceTime,
  distinctUntilChanged,
  filter,
  first,
  map,
  skip,
} from 'rxjs';

import type { Filter } from '@kbn/es-query';
import { combineCompatibleChildrenApis } from '@kbn/presentation-containers';
import {
  apiAppliesFilters,
  type AppliesFilters,
  type PublishingSubject,
} from '@kbn/presentation-publishing';

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
  const publishedChildFilters$ = new BehaviorSubject<Filter[] | undefined>(undefined);
  const unpublishedChildFilters$ = new BehaviorSubject<Filter[] | undefined>(undefined);

  const childFiltersLoading$ = combineCompatibleChildrenApis<AppliesFilters, boolean>(
    { children$: layoutManager.api.children$ },
    'filtersLoading$',
    apiAppliesFilters,
    true,
    (values) => values.some((loading) => loading)
  ).pipe(distinctUntilChanged());

  const childFilters$ = combineCompatibleChildrenApis<AppliesFilters, Filter[] | undefined>(
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
  ).pipe(distinctUntilChanged(deepEqual));

  const filterManagerSubscription = combineLatest([childFiltersLoading$, childFilters$])
    .pipe(
      debounceTime(0),
      filter(([loading, allChildFilters]) => !loading)
    )
    .subscribe(([loading, allChildFilters]) => {
      unpublishedChildFilters$.next(allChildFilters);
    });

  const publishFilters = () => {
    const published = publishedChildFilters$.getValue();
    const unpublished = unpublishedChildFilters$.getValue();
    if (!deepEqual(published, unpublished)) {
      publishedChildFilters$.next(unpublished);
    }
  };

  // when auto publish is `true`, push filters from `unpublishedFilters` directly to published
  const autoPublishFiltersSubscription = unpublishedChildFilters$
    .pipe(
      combineLatestWith(settingsManager.api.settings.autoApplyFilters$),
      filter(([_, autoApplyFilters]) => autoApplyFilters)
    )
    .subscribe(([filters, autoApplyFilters]) => {
      publishFilters();
    });

  // when auto-apply is `false`, publish filters when the children are done loading them
  if (!settingsManager.api.settings.autoApplyFilters$.getValue()) {
    unpublishedChildFilters$.pipe(skip(1), first()).subscribe(() => {
      publishFilters();
    });
  }

  const filters$ = new BehaviorSubject<Filter[] | undefined>(undefined);
  filterManagerSubscription.add(
    publishedChildFilters$
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
    api: {
      filters$,
      childFilters$: publishedChildFilters$,
      unpublishedChildFilters$,
      publishFilters,
      childFiltersLoading$: childFiltersLoading$ as PublishingSubject<boolean>,
    },
    cleanup: () => {
      autoPublishFiltersSubscription.unsubscribe();
      filterManagerSubscription.unsubscribe();
    },
  };
};
