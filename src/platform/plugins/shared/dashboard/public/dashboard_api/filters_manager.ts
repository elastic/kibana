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
  of,
  skip,
  skipWhile,
  startWith,
  switchMap,
  tap,
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
  const { renderedChildren$ } = layoutManager.internalApi;

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

  /** push filters to `unpublishedChildFilters$` once children are done computing their filters */
  const unpublishedFiltersSubscription = combineLatest({
    allChildFilters: childFilters$,
    loading: anyChildFiltersLoading$,
    // a change in what the children are awaiting also pushes, so that auto-apply publishes it along with their filters
    childrenAwaiting: childrenAwaitingRequiredFilters$,
  })
    .pipe(
      skip(1),
      debounceTime(0),
      filter(({ loading }) => !loading)
    )
    .subscribe(({ allChildFilters }) => {
      unpublishedChildFilters$.next(allChildFilters);
    });

  /** the filters of the pinned children alone, i.e. what remains once the grid is hidden */
  const getPinnedChildFilters = (): Filter[] | undefined => {
    const children = layoutManager.api.children$.getValue();
    const filters = Object.keys(layoutManager.api.layout$.getValue().pinnedPanels).flatMap(
      (uuid) => {
        const child = children[uuid];
        return apiAppliesFilters(child) ? child.appliedFilters$.getValue() ?? [] : [];
      }
    );
    return filters.length > 0 ? filters : undefined;
  };

  /**
   * The filters and the awaiting state are emitted back to back on purpose: when a required control is cleared,
   * the grid is unmounted right after the broader filters are published. Keep them together and in this order,
   * so mounted panels don't get the chance to fetch with the filters that no longer satisfy the required control.
   */
  const publishFilters = () => {
    const awaiting = childrenAwaitingRequiredFilters$.getValue();
    const published = publishedChildFilters$.getValue();
    // The grid is hidden in the same apply that starts awaiting, so its controls' filters are dropped rather
    // than published: users could no longer see or change them, yet they would keep narrowing the required
    // controls' choices, and the awaiting screen offers no second apply.
    const toPublish = awaiting ? getPinnedChildFilters() : unpublishedChildFilters$.getValue();
    if (!deepEqual(published, toPublish)) {
      publishedChildFilters$.next(toPublish);
    }
    if (awaiting !== awaitingRequiredFilters$.getValue()) {
      awaitingRequiredFilters$.next(awaiting);
    }
  };

  /**
   * The initial publish. On load, and again each time the grid opens, the filters of the rendered children are
   * published once without the user applying, as soon as every one of them has registered and finished
   * computing its filters. `initialPublishPending$` is `true` until then, which keeps fetching paused so that
   * panels don't fetch with filters that are still incomplete.
   */
  const initialPublishPending$ = new BehaviorSubject<boolean>(true);
  const initialPublishSubscription = awaitingRequiredFilters$
    .pipe(
      distinctUntilChanged(),
      // `switchMap` drops the wait in flight whenever the grid opens or is hidden, including when it is the
      // initial publish itself that opens the grid
      switchMap((awaiting, index) => {
        // hiding the grid leaves only the pinned children, which were published together with the awaiting state
        if (awaiting && index > 0) return of(false);
        return combineLatest([childFilters$, childFiltersLoading$]).pipe(
          debounceTime(0),
          first(([, loading]) => !loading),
          tap(([allChildFilters]) => {
            unpublishedChildFilters$.next(allChildFilters);
            publishFilters();
          }),
          map(() => false),
          startWith(true)
        );
      })
    )
    .subscribe((pending) => {
      if (pending !== initialPublishPending$.getValue()) initialPublishPending$.next(pending);
    });

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

  /**
   * When auto-apply is `false` and the dashboard is reset, publish once the children have settled, i.e. are
   * done computing their filters. `setState` only emits after every child has applied its new state, and a
   * control flags `filtersLoading$` as soon as its state changes, so this waits for the controls' new filters
   * when there are any, and resolves right away when the reset changes no filter-related state. This is the
   * same settle condition as the initial publish. `switchMap` drops the wait if another reset happens first.
   */
  const forcePublishSubscription = forcePublish$
    .pipe(
      switchMap(() =>
        combineLatest([childFilters$, childFiltersLoading$]).pipe(
          debounceTime(0),
          first(([, loading]) => !loading)
        )
      )
    )
    .subscribe(([allChildFilters]) => {
      unpublishedChildFilters$.next(allChildFilters);
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
    internalApi: { initialPublishPending$: initialPublishPending$.asObservable() },
    cleanup: () => {
      autoPublishFiltersSubscription.unsubscribe();
      unpublishedFiltersSubscription.unsubscribe();
      hasUnpublishedFiltersSubscription.unsubscribe();
      filtersSubscription.unsubscribe();
      forcePublishSubscription.unsubscribe();
      requiredFiltersSubscription.unsubscribe();
      initialPublishSubscription.unsubscribe();
    },
  };
};
