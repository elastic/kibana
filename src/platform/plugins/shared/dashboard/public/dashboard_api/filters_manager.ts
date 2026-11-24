/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import deepEqual from 'fast-deep-equal';
import { pick } from 'lodash';
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
  skipWhile,
  switchMap,
  type Subject,
} from 'rxjs';

import type { Filter } from '@kbn/es-query';
import {
  apiAppliesFilters,
  apiPublishesAwaitingRequiredFilters,
  combineCompatibleChildrenApis,
  type AppliesFilters,
  type PublishesAwaitingRequiredFilters,
} from '@kbn/presentation-publishing';

import type { initializeLayoutManager } from './layout_manager';
import type { initializeSettingsManager } from './settings_manager';
import type { initializeUnifiedSearchManager } from './unified_search_manager';

export const initializeFiltersManager = (
  unifiedSearchManager: ReturnType<typeof initializeUnifiedSearchManager>,
  layoutManager: ReturnType<typeof initializeLayoutManager>,
  settingsManager: ReturnType<typeof initializeSettingsManager>,
  forcePublish$: Subject<void>,
  awaitingRequiredFilters$: BehaviorSubject<boolean>
) => {
  const publishedChildFilters$ = new BehaviorSubject<Filter[] | undefined>(undefined);
  const unpublishedChildFilters$ = new BehaviorSubject<Filter[] | undefined>(undefined);

  const pinnedPanelIds$ = layoutManager.api.layout$.pipe(
    map((layout) => Object.keys(layout.pinnedPanels)),
    distinctUntilChanged<string[]>(deepEqual)
  );
  const childFiltersLoading$ = layoutManager.internalApi.childApisPending$
    .pipe(
      combineLatestWith(
        combineCompatibleChildrenApis<AppliesFilters, boolean>(
          { children$: layoutManager.api.children$ },
          'filtersLoading$',
          apiAppliesFilters,
          false,
          (values) => {
            return values.some((loading) => loading);
          }
        )
      )
    )
    .pipe(
      map(
        ([hasPendingChildApis, hasChildFiltersLoading]) =>
          hasPendingChildApis || hasChildFiltersLoading
      ),
      distinctUntilChanged()
    );

  /** whether the pinned children are awaiting required filters, regardless of whether it is published yet */
  const childrenAwaitingRequiredFilters$ = new BehaviorSubject<boolean>(
    awaitingRequiredFilters$.getValue()
  );
  const requiredFiltersSubscription = combineCompatibleChildrenApis<
    PublishesAwaitingRequiredFilters,
    boolean
  >(
    {
      // only pinned panels can be required; re-evaluate when children or pinned panels change
      children$: combineLatest([layoutManager.api.children$, pinnedPanelIds$]).pipe(
        // controls can only report that they are awaiting filters once mounted, so keep the initial value until then
        skipWhile(([children, pinnedIds]) => pinnedIds.some((uuid) => !children[uuid])),
        map(([children, pinnedIds]) => pick(children, pinnedIds))
      ),
    },
    'awaitingRequiredFilters$',
    apiPublishesAwaitingRequiredFilters,
    false,
    (values) => {
      return values.some((awaitingRequired) => awaitingRequired);
    }
  ).subscribe((awaiting) => {
    if (awaiting !== childrenAwaitingRequiredFilters$.getValue())
      childrenAwaitingRequiredFilters$.next(awaiting);
  });

  /** `true` while any child is still computing its filters */
  const anyChildFiltersLoading$ = combineCompatibleChildrenApis<AppliesFilters, boolean>(
    { children$: layoutManager.api.children$ },
    'filtersLoading$',
    apiAppliesFilters,
    false,
    (values) => {
      return values.some((loading) => loading);
    }
  );

  /** the filters that the children are currently outputting, regardless of whether they are published */
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

  /** push filters to `unpublishedChildFilters$` once children are done computing their filters */
  const unpublishedFiltersSubscription = childFilters$
    .pipe(
      // a change in what the children are awaiting also pushes, so that auto-apply publishes it along with their filters
      combineLatestWith(anyChildFiltersLoading$, childrenAwaitingRequiredFilters$),
      skip(1),
      debounceTime(0),
      filter(([, loading]) => !loading)
    )
    .subscribe(([allChildFilters]) => {
      unpublishedChildFilters$.next(allChildFilters);
    });

  const publishFilters = () => {
    const published = publishedChildFilters$.getValue();
    const unpublished = unpublishedChildFilters$.getValue();
    if (!deepEqual(published, unpublished)) {
      publishedChildFilters$.next(unpublished);
    }
    const awaiting = childrenAwaitingRequiredFilters$.getValue();
    if (awaiting !== awaitingRequiredFilters$.getValue()) {
      awaitingRequiredFilters$.next(awaiting);
    }
  };

  /** `true` while the unpublished child filters differ from the published ones */
  const hasUnpublishedFilters$ = new BehaviorSubject<boolean>(false);
  const hasUnpublishedFiltersSubscription = combineLatest([
    publishedChildFilters$,
    unpublishedChildFilters$,
  ])
    .pipe(map(([published, unpublished]) => !deepEqual(published ?? [], unpublished ?? [])))
    .subscribe((hasUnpublished) => {
      if (hasUnpublished !== hasUnpublishedFilters$.getValue()) {
        hasUnpublishedFilters$.next(hasUnpublished);
      }
    });

  /** when auto-apply is `true`, push filters from `unpublishedFilters$` directly to published */
  const autoPublishFiltersSubscription = unpublishedChildFilters$
    .pipe(
      combineLatestWith(settingsManager.api.settings.autoApplyFilters$),
      filter(([_, autoApplyFilters]) => autoApplyFilters)
    )
    .subscribe(([filters, autoApplyFilters]) => {
      publishFilters();
    });

  /** when auto-apply is `false`, publish the first set of filters once the children are done loading them */
  if (!settingsManager.api.settings.autoApplyFilters$.getValue()) {
    unpublishedChildFilters$.pipe(skip(1), first()).subscribe(() => {
      publishFilters();
    });
  }

  /** when auto-apply is `false` and the dashboard is reset, wait for new filters to be updated and publish them */
  const forcePublishSubscription = forcePublish$
    .pipe(
      switchMap(async () => {
        await new Promise((resolve) => {
          unpublishedChildFilters$.pipe(first()).subscribe(resolve);
        });
      })
    )
    .subscribe(() => {
      publishFilters();
    });

  const filters$ = new BehaviorSubject<Filter[] | undefined>(undefined);
  const filtersSubscription = publishedChildFilters$
    .pipe(
      combineLatestWith(unifiedSearchManager.internalApi.unifiedSearchFilters$),
      map(([childFilters, unifiedSearchFilters]) => {
        return [...(childFilters ?? []), ...(unifiedSearchFilters ?? [])];
      })
    )
    .subscribe((allFilters) => {
      filters$.next(allFilters);
    });

  return {
    api: {
      filters$,
      publishedChildFilters$,
      unpublishedChildFilters$,
      hasUnpublishedFilters$,
      childFiltersLoading$,
      publishFilters,
      awaitingRequiredFilters$,
    },
    internalApi: {
      anyChildFiltersLoading$,
    },
    cleanup: () => {
      autoPublishFiltersSubscription.unsubscribe();
      unpublishedFiltersSubscription.unsubscribe();
      hasUnpublishedFiltersSubscription.unsubscribe();
      filtersSubscription.unsubscribe();
      forcePublishSubscription.unsubscribe();
      requiredFiltersSubscription.unsubscribe();
    },
  };
};
