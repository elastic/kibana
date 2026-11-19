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
  from,
  map,
  of,
  skip,
  switchMap,
  type Observable,
  type Subject,
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
   * `undefined` until we know whether any pinned panel is waiting on a required value (briefly, while the
   * panels' definitions load). Consumers must not treat `undefined` as "not waiting".
   */
  const awaitingRequiredFilters$ = new BehaviorSubject<boolean | undefined>(undefined);

  /**
   * Before a pinned panel has mounted, ask its registered definition whether its saved state will leave it
   * waiting on a required value; once it has mounted, the live `awaitingRequiredFilters$` takes over.
   */
  const getUnmountedAwaitingRequired = async (uuid: string): Promise<boolean> => {
    const panel = layoutManager.api.layout$.getValue().pinnedPanels[uuid];
    if (!panel) return false;
    try {
      const definition = await embeddableService.getEmbeddableDefinition(panel.type);
      const state = layoutManager.internalApi.getSerializedStateForPanel(uuid);
      return Boolean(state && definition?.isAwaitingRequiredFilters?.(state));
    } catch (e) {
      // if the definition cannot be loaded, do not block the dashboard; the live value takes over once mounted
      return false;
    }
  };

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
          pinnedIds.map((uuid): Observable<boolean> => {
            const child = children[uuid];
            if (!child) return from(getUnmountedAwaitingRequired(uuid));
            return apiPublishesAwaitingRequiredFilters(child)
              ? child.awaitingRequiredFilters$
              : of(false);
          })
        ).pipe(map((values) => values.some(Boolean)));
      }),
      distinctUntilChanged()
    )
    .subscribe((awaitingRequired) => awaitingRequiredFilters$.next(awaitingRequired));

  const childFiltersLoading$ = combineLatest([
    layoutManager.internalApi.childrenLoading$,
    awaitingRequiredFilters$,
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

  const publishFilters = () => {
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
      forcePublishSubscription.unsubscribe();
    },
  };
};
