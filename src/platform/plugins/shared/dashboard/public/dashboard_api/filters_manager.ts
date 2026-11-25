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
  /**
   * Children that are actually rendered. The APIs of unmounted children (e.g. grid panels replaced by the
   * awaiting screen, or in a collapsed section) stay in `children$`, but their subscriptions are gone, so
   * a `filtersLoading$` that was set to `true` after unmounting would never be reset.
   */
  const renderedChildren$ = combineLatest([
    layoutManager.api.children$,
    layoutManager.internalApi.visibleChildren$,
  ]).pipe(map(([children, visibleIds]) => pick(children, visibleIds)));

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
    { children$: renderedChildren$ },
    'filtersLoading$',
    apiAppliesFilters,
    false,
    (values) => {
      return values.some((loading) => loading);
    }
  );

  /** `true` while any rendered child's API is pending or any child is still computing its filters */
  const childFiltersLoading$ = combineLatest([
    layoutManager.internalApi.childApisPending$,
    anyChildFiltersLoading$,
  ]).pipe(
    map(
      ([hasPendingChildApis, hasChildFiltersLoading]) =>
        hasPendingChildApis || hasChildFiltersLoading
    ),
    distinctUntilChanged()
  );

  /** the filters that the children are currently outputting, regardless of whether they are published */
  const childFilters$ = combineCompatibleChildrenApis<AppliesFilters, Filter[] | undefined>(
    // Only rendered children apply filters. While required controls are unsatisfied the grid is hidden, so a
    // hidden grid control's filter can't leave a required control with no values it could select.
    { children$: renderedChildren$ },
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

  /** when auto-apply is `false`, the first set of complete filters is published automatically, exactly once */
  let initialPublishPending = !settingsManager.api.settings.autoApplyFilters$.getValue();
  /** push filters to `unpublishedChildFilters$` once children are done computing their filters */
  const unpublishedFiltersSubscription = childFilters$
    .pipe(
      // a change in what the children are awaiting also pushes, so that auto-apply publishes it along with their filters
      combineLatestWith(
        anyChildFiltersLoading$,
        childrenAwaitingRequiredFilters$,
        layoutManager.internalApi.childApisPending$,
        // the grid mounting (published awaiting state going to `false`) also pushes, so grid controls' saved
        // selections can be published as soon as they have reported
        awaitingRequiredFilters$
      ),
      skip(1),
      debounceTime(0),
      filter(([, loading]) => !loading)
    )
    .subscribe(([allChildFilters, , , hasPendingChildApis]) => {
      unpublishedChildFilters$.next(allChildFilters);
      // don't consume the initial publish until every rendered child (including the pinned controls) has
      // registered, so slower controls have reported their filters
      if (initialPublishPending && !hasPendingChildApis) {
        initialPublishPending = false;
        publishFilters();
      }
    });

  /**
   * The filters and the awaiting state are emitted back to back on purpose: when a required control is cleared,
   * the grid is unmounted right after the broader filters are published. Keep them together and in this order,
   * so mounted panels don't get the chance to fetch with the filters that no longer satisfy the required control.
   */
  const publishFilters = () => {
    const published = publishedChildFilters$.getValue();
    const unpublished = unpublishedChildFilters$.getValue();
    if (!deepEqual(published, unpublished)) {
      publishedChildFilters$.next(unpublished);
    }
    const awaiting = childrenAwaitingRequiredFilters$.getValue();
    if (awaiting !== awaitingRequiredFilters$.getValue()) {
      // The grid was not rendered while awaiting, so the initial publish only saw the pinned controls. Re-arm it
      // so the saved selections of grid controls are published once the grid opens.
      if (!awaiting && !settingsManager.api.settings.autoApplyFilters$.getValue()) {
        initialPublishPending = true;
      }
      awaitingRequiredFilters$.next(awaiting);
    }
  };

  /**
   * `true` while the unpublished child filters, or whether the children are awaiting required filters,
   * differ from what is published. The awaiting state can change without the filters changing (e.g. a
   * required control is made optional, unpinned or deleted), and still needs to be applied.
   */
  const hasUnpublishedFilters$ = new BehaviorSubject<boolean>(false);
  const hasUnpublishedFiltersSubscription = combineLatest([
    publishedChildFilters$,
    unpublishedChildFilters$,
    childrenAwaitingRequiredFilters$,
    awaitingRequiredFilters$,
  ])
    .pipe(
      map(
        ([published, unpublished, childrenAwaiting, awaiting]) =>
          !deepEqual(published ?? [], unpublished ?? []) || childrenAwaiting !== awaiting
      )
    )
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

  /** when auto-apply is `false` and the dashboard is reset, wait for new filters to be updated and publish them */
  const forcePublishSubscription = forcePublish$
    .pipe(
      switchMap(async () => {
        await new Promise((resolve) => {
          // `unpublishedChildFilters$` replays its current (pre-reset) value on subscribe, so skip it and wait
          // for the next push, which happens once the controls have reported their filters
          unpublishedChildFilters$.pipe(skip(1), first()).subscribe(resolve);
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
