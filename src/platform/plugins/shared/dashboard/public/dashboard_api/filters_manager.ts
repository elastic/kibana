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
  defer,
  distinctUntilChanged,
  filter,
  first,
  map,
  merge,
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

/**
 * Whether two filter lists hold the same filters, in any order. A section toggle splices one section's filters
 * in and out of the published list, so their position can differ from the children's order without any
 * filter having changed.
 */
const areFiltersEqual = (filtersA: Filter[] = [], filtersB: Filter[] = []): boolean =>
  filtersA.length === filtersB.length &&
  filtersA.every((filterA) => filtersB.some((filterB) => deepEqual(filterA, filterB)));

/** Joins several filter lists into one, or `undefined` when there are no filters at all. */
const flattenFilters = (filterLists: Array<Filter[] | undefined>): Filter[] | undefined => {
  const allFilters = filterLists.flatMap((filters) => filters ?? []);
  return allFilters.length > 0 ? allFilters : undefined;
};

const anyTrue = (values: boolean[]): boolean => values.some(Boolean);

/** What the children output: their filters, and whether the pinned ones are awaiting required filters. */
interface ChildFiltersState {
  childFilters: Filter[] | undefined;
  awaitingRequiredFilters: boolean;
}

export const initializeFiltersManager = (
  unifiedSearchManager: ReturnType<typeof initializeUnifiedSearchManager>,
  layoutManager: ReturnType<typeof initializeLayoutManager>,
  settingsManager: ReturnType<typeof initializeSettingsManager>,
  forcePublish$: Subject<void>,
  awaitingRequiredFilters$: BehaviorSubject<boolean>
) => {
  const { children$, layout$ } = layoutManager.api;
  const { renderedChildren$, childApisPending$, sectionToggled$ } = layoutManager.internalApi;
  const { autoApplyFilters$ } = settingsManager.api.settings;

  // `unpublishedFilters$` is what the children output, staged as one snapshot. `publishFilters` copies it into
  // `publishedChildFilters$` and `awaitingRequiredFilters$`.
  const publishedChildFilters$ = new BehaviorSubject<Filter[] | undefined>(undefined);
  const unpublishedFilters$ = new BehaviorSubject<ChildFiltersState>({
    childFilters: undefined,
    awaitingRequiredFilters: awaitingRequiredFilters$.getValue(),
  });

  const pinnedPanelIds$ = layout$.pipe(
    map(({ pinnedPanels }) => Object.keys(pinnedPanels)),
    distinctUntilChanged<string[]>(deepEqual)
  );

  /** whether the pinned children are currently awaiting required filters */
  const childrenAwaitingRequiredFilters$ = defer(() =>
    combineCompatibleChildrenApis<PublishesAwaitingRequiredFilters, boolean>(
      {
        // only pinned panels can be required; re-evaluate when children or pinned panels change
        children$: combineLatest([children$, pinnedPanelIds$]).pipe(
          // controls can only report that they are awaiting filters once mounted, so keep the published value until then
          skipWhile(([children, pinnedIds]) => pinnedIds.some((uuid) => !children[uuid])),
          map(([children, pinnedIds]) => pick(children, pinnedIds))
        ),
      },
      'awaitingRequiredFilters$',
      apiPublishesAwaitingRequiredFilters,
      false,
      anyTrue
    ).pipe(startWith(awaitingRequiredFilters$.getValue()), distinctUntilChanged())
  );

  /**
   * The filters that the children are currently outputting. Only rendered children apply filters: while
   * required controls are unsatisfied the grid is hidden, so a hidden grid control's filter can't leave a
   * required control with no values it could select.
   */
  const childFilters$ = combineCompatibleChildrenApis<AppliesFilters, Filter[] | undefined>(
    { children$: renderedChildren$ },
    'appliedFilters$',
    apiAppliesFilters,
    [],
    flattenFilters
  ).pipe(distinctUntilChanged(deepEqual));

  /** `true` while any rendered child is still computing its filters */
  const anyChildFiltersLoading$ = combineCompatibleChildrenApis<AppliesFilters, boolean>(
    { children$: renderedChildren$ },
    'filtersLoading$',
    apiAppliesFilters,
    false,
    anyTrue
  );

  /** `true` while any rendered child's API is pending or any child is still computing its filters */
  const childFiltersLoading$ = combineLatest([childApisPending$, anyChildFiltersLoading$]).pipe(
    map(([apisPending, filtersLoading]) => apisPending || filtersLoading),
    distinctUntilChanged()
  );

  /** what the children are currently outputting, regardless of whether it is staged or published */
  const childFiltersState$ = combineLatest({
    childFilters: childFilters$,
    awaitingRequiredFilters: childrenAwaitingRequiredFilters$,
  });

  /**
   * Emits what the children output once, as soon as every rendered child has registered and is done computing
   * its filters. `setState` only emits after every child has applied its new state, and a control flags
   * `filtersLoading$` as soon as its state changes, so this waits for the controls' new filters when there
   * are any, and emits right away when nothing filter-related changed.
   */
  const settledChildFiltersState$ = combineLatest([childFiltersState$, childFiltersLoading$]).pipe(
    debounceTime(0),
    first(([, loading]) => !loading),
    map(([childFiltersState]) => childFiltersState)
  );

  /**
   * Stages what the children output once they are done computing their filters. The filters and the awaiting
   * state are staged together, so that a publish can never pair one batch of filters with a newer awaiting state.
   */
  const unpublishedFiltersSubscription = combineLatest([
    childFiltersState$,
    anyChildFiltersLoading$,
  ])
    .pipe(
      skip(1),
      debounceTime(0),
      filter(([, loading]) => !loading)
    )
    .subscribe(([childFiltersState]) => unpublishedFilters$.next(childFiltersState));

  /** the filters of the pinned children alone, i.e. what remains once the grid is hidden */
  const getPinnedChildFilters = (): Filter[] | undefined => {
    const children = children$.getValue();
    return flattenFilters(
      Object.keys(layout$.getValue().pinnedPanels).map((uuid) => {
        const child = children[uuid];
        return apiAppliesFilters(child) ? child.appliedFilters$.getValue() : undefined;
      })
    );
  };

  /**
   * The filters and the awaiting state are emitted back to back on purpose: when a required control is cleared,
   * the grid is unmounted right after the broader filters are published. Keep them together and in this order,
   * so mounted panels don't get the chance to fetch with the filters that no longer satisfy the required control.
   */
  const publishFilters = () => {
    const { childFilters, awaitingRequiredFilters } = unpublishedFilters$.getValue();
    // The grid is hidden in the same apply that starts awaiting, so its controls' filters are dropped rather
    // than published: users could no longer see or change them, yet they would keep narrowing the required
    // controls' choices, and the awaiting screen offers no second apply.
    const toPublish = awaitingRequiredFilters ? getPinnedChildFilters() : childFilters;
    if (!areFiltersEqual(publishedChildFilters$.getValue(), toPublish)) {
      publishedChildFilters$.next(toPublish);
    }
    if (awaitingRequiredFilters !== awaitingRequiredFilters$.getValue()) {
      awaitingRequiredFilters$.next(awaitingRequiredFilters);
    }
  };

  /**
   * The initial publish. On load, and again each time the grid opens, the filters of the rendered children are
   * published once without the user applying, as soon as they have settled. `initialPublishPending$` is `true`
   * until then, which keeps fetching paused so that panels don't fetch with filters that are still incomplete.
   */
  const initialPublishPending$ = new BehaviorSubject<boolean>(true);
  const initialPublishSubscription = awaitingRequiredFilters$
    .pipe(
      distinctUntilChanged(),
      // `switchMap` drops the wait in flight whenever the grid opens or is hidden, including when it is the
      // initial publish itself that opens the grid
      switchMap((awaiting, index) =>
        awaiting && index > 0
          ? of(false) // hiding the grid leaves only the pinned children, which were published with the awaiting state
          : settledChildFiltersState$.pipe(
              tap((childFiltersState: ChildFiltersState) => {
                // stage and publish filters
                unpublishedFilters$.next(childFiltersState);
                publishFilters();
              }),
              map(() => false),
              startWith(true)
            )
      ),
      distinctUntilChanged()
    )
    .subscribe((pending) => initialPublishPending$.next(pending));

  /**
   * `true` while the staged child filters, or the staged awaiting state, differ from what is published. The
   * awaiting state can change without the filters changing (e.g. a required control is made optional,
   * unpinned or deleted), and still needs to be applied.
   */
  const hasUnpublishedFilters$ = combineLatest([
    unpublishedFilters$,
    publishedChildFilters$,
    awaitingRequiredFilters$,
  ]).pipe(
    map(
      ([{ childFilters, awaitingRequiredFilters }, published, awaiting]) =>
        !areFiltersEqual(published, childFilters) || awaitingRequiredFilters !== awaiting
    ),
    distinctUntilChanged()
  );

  const publishSubscription = merge(
    // auto-apply: publish every staged change right away
    unpublishedFilters$.pipe(
      combineLatestWith(autoApplyFilters$),
      filter(([, autoApplyFilters]) => autoApplyFilters)
    ),
    // reset: publish once the children have settled; `switchMap` drops the wait if another reset starts first
    forcePublish$.pipe(
      switchMap(() => settledChildFiltersState$),
      tap((childFiltersState) => unpublishedFilters$.next(childFiltersState))
    )
  ).subscribe(() => publishFilters());

  /**
   * Collapsing or expanding a section only changes which controls are rendered, so it never needs an Apply,
   * but it must not apply anything else either. Once the children have settled, only the toggled sections'
   * filters are swapped in the published list: a collapsed section's filters leave it and an expanded section's
   * filters join it, while every other filter, pending or not, and the awaiting state stay as they are. With
   * auto-apply on there is nothing to publish, and the initial publish covers the grid opening.
   */
  const sectionToggledSubscription = sectionToggled$
    .pipe(
      filter(
        () =>
          !initialPublishPending$.getValue() &&
          !awaitingRequiredFilters$.getValue() &&
          !autoApplyFilters$.getValue()
      ),
      switchMap((toggledSectionIds) =>
        settledChildFiltersState$.pipe(
          map(({ childFilters }) => ({ toggledSectionIds, childFilters }))
        )
      )
    )
    .subscribe(({ toggledSectionIds, childFilters }) => {
      const isInToggledSection = ({ meta }: Filter) =>
        Boolean(meta.group && toggledSectionIds.includes(meta.group));
      const published = publishedChildFilters$.getValue();
      const toPublish = flattenFilters([
        published?.filter((childFilter) => !isInToggledSection(childFilter)),
        childFilters?.filter(isInToggledSection),
      ]);
      if (!areFiltersEqual(published, toPublish)) {
        publishedChildFilters$.next(toPublish);
      }
    });

  const filters$ = new BehaviorSubject<Filter[] | undefined>(undefined);
  const filtersSubscription = combineLatest([
    publishedChildFilters$,
    unifiedSearchManager.internalApi.unifiedSearchFilters$,
  ]).subscribe(([childFilters, unifiedSearchFilters]) =>
    filters$.next([...(childFilters ?? []), ...(unifiedSearchFilters ?? [])])
  );

  return {
    api: {
      filters$,
      publishedChildFilters$,
      hasUnpublishedFilters$,
      childFiltersLoading$,
      publishFilters,
      awaitingRequiredFilters$,
    },
    internalApi: {
      initialPublishPending$: initialPublishPending$.asObservable(),
      unpublishedFilters$,
    },
    cleanup: () => {
      unpublishedFiltersSubscription.unsubscribe();
      initialPublishSubscription.unsubscribe();
      publishSubscription.unsubscribe();
      sectionToggledSubscription.unsubscribe();
      filtersSubscription.unsubscribe();
    },
  };
};
