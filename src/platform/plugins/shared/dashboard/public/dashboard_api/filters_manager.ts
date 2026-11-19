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
  of,
  skip,
  switchMap,
  takeUntil,
  type Observable,
  Subject,
} from 'rxjs';

import type { Filter } from '@kbn/es-query';
import {
  combineCompatibleChildrenApis,
  apiAppliesFilters,
  type AppliesFilters,
} from '@kbn/presentation-publishing';

import { embeddableService } from '../services/kibana_services';
import type { initializeLayoutManager } from './layout_manager';
import type { initializeSettingsManager } from './settings_manager';
import type { initializeUnifiedSearchManager } from './unified_search_manager';

const apiPublishesAwaitingRequiredFilters = <ApiType extends object>(
  api: ApiType
): api is ApiType & { awaitingRequiredFilters$: Observable<boolean> } =>
  Boolean((api as { awaitingRequiredFilters$?: Observable<boolean> }).awaitingRequiredFilters$);

export const initializeFiltersManager = (
  unifiedSearchManager: ReturnType<typeof initializeUnifiedSearchManager>,
  layoutManager: ReturnType<typeof initializeLayoutManager>,
  settingsManager: ReturnType<typeof initializeSettingsManager>,
  forcePublish$: Subject<void>
) => {
  const publishedChildFilters$ = new BehaviorSubject<Filter[] | undefined>(undefined);
  const unpublishedChildFilters$ = new BehaviorSubject<Filter[] | undefined>(undefined);
  /**
   * `undefined` until we know whether any pinned panel is waiting on a required value (while panels that
   * block loading have not mounted yet). Consumers must not treat `undefined` as "not waiting", but it must not
   * show the awaiting screen either: loading is just paused.
   */
  const awaitingRequiredFilters$ = new BehaviorSubject<boolean | undefined>(undefined);

  /**
   * Before a pinned panel has mounted its API is not available, so its awaiting state is unknown if its type is
   * registered as blocking loading until then; once it has mounted, its live `awaitingRequiredFilters$` takes over.
   */
  const isUnmountedPanelBlocking = (uuid: string): boolean => {
    const panel = layoutManager.api.layout$.getValue().pinnedPanels[uuid];
    return Boolean(panel && embeddableService.shouldBlockLoadingUntilApiAvailable(panel.type));
  };

  /** whether any pinned panel itself reports that it is waiting on a required value */
  const childAwaitingRequired$ = new BehaviorSubject<boolean | undefined>(undefined);

  const awaitingRequiredSubscription = combineLatest([
    layoutManager.api.layout$,
    layoutManager.api.children$,
  ])
    .pipe(
      switchMap(([layout, children]) => {
        // only pinned panels can be required
        const pinnedIds = Object.keys(layout.pinnedPanels);
        if (pinnedIds.length === 0) return of(false);

        return combineLatest(
          pinnedIds.map((uuid): Observable<boolean | undefined> => {
            const child = children[uuid];
            if (!child) return of(isUnmountedPanelBlocking(uuid) ? undefined : false);
            return apiPublishesAwaitingRequiredFilters(child)
              ? child.awaitingRequiredFilters$
              : of(false);
          })
        ).pipe(map((values) => (values.includes(undefined) ? undefined : values.some(Boolean))));
      }),
      distinctUntilChanged()
    )
    .subscribe((awaitingRequired) => childAwaitingRequired$.next(awaitingRequired));

  /**
   * With auto-apply on, the dashboard's awaiting state follows the children. With auto-apply off, it takes
   * the children's value once (when it is first known) and afterwards only when filters are published, in
   * both directions: supplying a required value keeps the awaiting screen up, and clearing one keeps the
   * grid up, until the user applies the change.
   */
  const awaitingSyncSubscription = combineLatest([
    childAwaitingRequired$,
    settingsManager.api.settings.autoApplyFilters$,
  ]).subscribe(([childAwaiting, autoApply]) => {
    if (childAwaiting === undefined) return;
    if (autoApply || awaitingRequiredFilters$.getValue() === undefined) {
      awaitingRequiredFilters$.next(childAwaiting);
    }
  });

  const childFiltersLoading$ = combineLatest([
    layoutManager.internalApi.childrenLoading$,
    // use the children's own flag, not the deferred one: it must not block unpublished filters
    // from updating, since that is what lets the user publish them
    childAwaitingRequired$,
  ])
    .pipe(
      map(([childrenLoading, awaitingRequiredFilters]) => {
        return childrenLoading ? awaitingRequiredFilters !== false : false;
      }),
      combineLatestWith(
        combineCompatibleChildrenApis<AppliesFilters, boolean>(
          { children$: layoutManager.api.children$ },
          'filtersLoading$',
          apiAppliesFilters,
          false,
          (values) => {
            console.log({ values });
            return values.some((loading) => loading);
          }
        )
      )
    )
    .pipe(
      map(([childrenLoading, filtersLoading]) => childrenLoading || filtersLoading),
      distinctUntilChanged()
    );

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

  /** don't push filters to `unpublishedFilters$` until all children have their filters ready */
  const filterManagerSubscription = combineLatest([childFiltersLoading$, childFilters$])
    .pipe(
      skip(1),
      debounceTime(0),
      filter(([loading, allChildFilters]) => !loading)
    )
    .subscribe(([loading, allChildFilters]) => {
      console.log({ loading });
      unpublishedChildFilters$.next(allChildFilters);
    });

  const filtersPublished$ = new Subject<void>();
  const publishFilters = () => {
    const childAwaiting = childAwaitingRequired$.getValue();
    if (childAwaiting !== undefined) awaitingRequiredFilters$.next(childAwaiting);
    filtersPublished$.next();
    const published = publishedChildFilters$.getValue();
    const unpublished = unpublishedChildFilters$.getValue();
    if (!deepEqual(published, unpublished)) {
      publishedChildFilters$.next(unpublished);
    }
  };

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
    unpublishedChildFilters$
      .pipe(
        skip(1),
        // a change to whether a required value is supplied must be published by the user, not automatically
        filter(() => awaitingRequiredFilters$.getValue() !== true),
        takeUntil(filtersPublished$),
        first()
      )
      .subscribe(() => {
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
      publishedChildFilters$,
      unpublishedChildFilters$,
      childFiltersLoading$,
      publishFilters,
      awaitingRequiredFilters$,
    },
    cleanup: () => {
      autoPublishFiltersSubscription.unsubscribe();
      filterManagerSubscription.unsubscribe();
      awaitingRequiredSubscription.unsubscribe();
      awaitingSyncSubscription.unsubscribe();
      forcePublishSubscription.unsubscribe();
    },
  };
};
