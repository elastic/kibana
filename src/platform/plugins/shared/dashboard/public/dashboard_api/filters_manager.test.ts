/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject, Subject } from 'rxjs';

import type { Filter } from '@kbn/es-query';

import { initializeFiltersManager } from './filters_manager';
import type { initializeLayoutManager } from './layout_manager';
import type { initializeSettingsManager } from './settings_manager';
import type { initializeUnifiedSearchManager } from './unified_search_manager';

interface MockChild {
  uuid: string;
  awaitingRequiredFilters$?: BehaviorSubject<boolean>;
  filtersLoading$?: BehaviorSubject<boolean>;
  appliedFilters$?: BehaviorSubject<Filter[] | undefined>;
}

const buildSetup = (pinnedPanelIds: string[] = []) => {
  const children$ = new BehaviorSubject<{ [uuid: string]: MockChild }>({});
  const layout$ = new BehaviorSubject({
    panels: {},
    sections: {},
    pinnedPanels: Object.fromEntries(pinnedPanelIds.map((id) => [id, { order: 0 }])),
  });
  const childrenLoading$ = new BehaviorSubject<boolean>(false);
  const layoutManager = {
    api: { children$, layout$ },
    internalApi: { childrenLoading$ },
  } as unknown as ReturnType<typeof initializeLayoutManager>;
  const settingsManager = {
    api: { settings: { autoApplyFilters$: new BehaviorSubject<boolean>(true) } },
  } as unknown as ReturnType<typeof initializeSettingsManager>;
  const unifiedSearchManager = {
    internalApi: { unifiedSearchFilters$: new BehaviorSubject<Filter[] | undefined>(undefined) },
  } as unknown as ReturnType<typeof initializeUnifiedSearchManager>;

  const awaitingRequiredFilters$ = new BehaviorSubject<boolean>(false);
  const filtersManager = initializeFiltersManager(
    unifiedSearchManager,
    layoutManager,
    settingsManager,
    new Subject<void>(),
    awaitingRequiredFilters$
  );

  const setChildren = (children: MockChild[]) =>
    children$.next(Object.fromEntries(children.map((child) => [child.uuid, child])));

  return { filtersManager, awaitingRequiredFilters$, layout$, setChildren, childrenLoading$ };
};

describe('filters manager: awaiting required filters', () => {
  test('is false when no child publishes awaitingRequiredFilters$', () => {
    const { awaitingRequiredFilters$, setChildren } = buildSetup(['control1']);
    setChildren([{ uuid: 'control1' }]);
    expect(awaitingRequiredFilters$.value).toBe(false);
  });

  test('is true while a pinned child is awaiting, and false once it is satisfied', () => {
    const { awaitingRequiredFilters$, setChildren } = buildSetup(['control1']);
    const awaiting$ = new BehaviorSubject<boolean>(true);
    setChildren([{ uuid: 'control1', awaitingRequiredFilters$: awaiting$ }]);
    expect(awaitingRequiredFilters$.value).toBe(true);

    awaiting$.next(false);
    expect(awaitingRequiredFilters$.value).toBe(false);
  });

  test('is true if any one of several pinned children is awaiting', () => {
    const { awaitingRequiredFilters$, setChildren } = buildSetup(['control1', 'control2']);
    const first$ = new BehaviorSubject<boolean>(false);
    const second$ = new BehaviorSubject<boolean>(true);
    setChildren([
      { uuid: 'control1', awaitingRequiredFilters$: first$ },
      { uuid: 'control2', awaitingRequiredFilters$: second$ },
    ]);
    expect(awaitingRequiredFilters$.value).toBe(true);

    second$.next(false);
    expect(awaitingRequiredFilters$.value).toBe(false);
  });

  test('ignores children that are not pinned', () => {
    const { awaitingRequiredFilters$, setChildren } = buildSetup(['control1']);
    setChildren([
      { uuid: 'control1', awaitingRequiredFilters$: new BehaviorSubject<boolean>(false) },
      { uuid: 'gridPanel', awaitingRequiredFilters$: new BehaviorSubject<boolean>(true) },
    ]);
    expect(awaitingRequiredFilters$.value).toBe(false);
  });

  test('re-evaluates when a mounted panel becomes pinned', () => {
    const { awaitingRequiredFilters$, layout$, setChildren } = buildSetup([]);
    setChildren([
      { uuid: 'control1', awaitingRequiredFilters$: new BehaviorSubject<boolean>(true) },
    ]);
    expect(awaitingRequiredFilters$.value).toBe(false);

    layout$.next({ ...layout$.value, pinnedPanels: { control1: { order: 0 } } });
    expect(awaitingRequiredFilters$.value).toBe(true);
  });

  test('re-evaluates when a pinned panel is unpinned', () => {
    const { awaitingRequiredFilters$, layout$, setChildren } = buildSetup(['control1']);
    setChildren([
      { uuid: 'control1', awaitingRequiredFilters$: new BehaviorSubject<boolean>(true) },
    ]);
    expect(awaitingRequiredFilters$.value).toBe(true);

    layout$.next({ ...layout$.value, pinnedPanels: {} });
    expect(awaitingRequiredFilters$.value).toBe(false);
  });

  test('stops tracking children after cleanup', () => {
    const { filtersManager, awaitingRequiredFilters$, setChildren } = buildSetup(['control1']);
    const awaiting$ = new BehaviorSubject<boolean>(true);
    setChildren([{ uuid: 'control1', awaitingRequiredFilters$: awaiting$ }]);
    expect(awaitingRequiredFilters$.value).toBe(true);

    filtersManager.cleanup();
    awaiting$.next(false);
    expect(awaitingRequiredFilters$.value).toBe(true);
  });

  test('childFiltersLoading$ is true while awaiting required filters, even if no child is loading', () => {
    const { filtersManager, setChildren } = buildSetup(['control1']);
    const awaiting$ = new BehaviorSubject<boolean>(true);
    const loadingStates: boolean[] = [];
    filtersManager.api.childFiltersLoading$.subscribe((loading) => loadingStates.push(loading));
    setChildren([
      {
        uuid: 'control1',
        awaitingRequiredFilters$: awaiting$,
        filtersLoading$: new BehaviorSubject<boolean>(false),
        appliedFilters$: new BehaviorSubject<Filter[] | undefined>(undefined),
      },
    ]);
    expect(loadingStates.at(-1)).toBe(true);

    awaiting$.next(false);
    expect(loadingStates.at(-1)).toBe(false);
  });

  test('childFiltersLoading$ is true while children are still registering, even if no registered child is loading', () => {
    const { filtersManager, childrenLoading$ } = buildSetup(['control1']);
    const loadingStates: boolean[] = [];
    filtersManager.api.childFiltersLoading$.subscribe((loading) => loadingStates.push(loading));
    childrenLoading$.next(true);
    expect(loadingStates.at(-1)).toBe(true);

    childrenLoading$.next(false);
    expect(loadingStates.at(-1)).toBe(false);
  });
});
