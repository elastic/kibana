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

const flush = () => new Promise((resolve) => setTimeout(resolve, 10));

const buildSetup = (
  pinnedPanelIds: string[] = [],
  autoApplyFilters: boolean = true,
  initiallyAwaitingFilters: boolean = false
) => {
  const children$ = new BehaviorSubject<{ [uuid: string]: MockChild }>({});
  const layout$ = new BehaviorSubject({
    panels: {},
    sections: {},
    pinnedPanels: Object.fromEntries(pinnedPanelIds.map((id) => [id, { order: 0 }])),
  });
  const layoutManager = {
    api: { children$, layout$ },
  } as unknown as ReturnType<typeof initializeLayoutManager>;
  const settingsManager = {
    api: { settings: { autoApplyFilters$: new BehaviorSubject<boolean>(autoApplyFilters) } },
  } as unknown as ReturnType<typeof initializeSettingsManager>;
  const unifiedSearchManager = {
    internalApi: { unifiedSearchFilters$: new BehaviorSubject<Filter[] | undefined>(undefined) },
  } as unknown as ReturnType<typeof initializeUnifiedSearchManager>;

  const awaitingRequiredFilters$ = new BehaviorSubject<boolean>(initiallyAwaitingFilters);
  const filtersManager = initializeFiltersManager(
    unifiedSearchManager,
    layoutManager,
    settingsManager,
    new Subject<void>(),
    awaitingRequiredFilters$
  );

  const setChildren = (children: MockChild[]) =>
    children$.next(Object.fromEntries(children.map((child) => [child.uuid, child])));

  return { filtersManager, awaitingRequiredFilters$, layout$, setChildren };
};

describe('filters manager: awaiting required filters', () => {
  test('is false when no child publishes awaitingRequiredFilters$', async () => {
    const { awaitingRequiredFilters$, setChildren } = buildSetup(['control1']);
    setChildren([{ uuid: 'control1' }]);
    await flush();
    expect(awaitingRequiredFilters$.value).toBe(false);
  });

  test('is true while a pinned child is awaiting, and false once it is satisfied', async () => {
    const { awaitingRequiredFilters$, setChildren } = buildSetup(['control1']);
    const awaiting$ = new BehaviorSubject<boolean>(true);
    setChildren([{ uuid: 'control1', awaitingRequiredFilters$: awaiting$ }]);
    await flush();
    expect(awaitingRequiredFilters$.value).toBe(true);

    awaiting$.next(false);
    await flush();
    expect(awaitingRequiredFilters$.value).toBe(false);
  });

  test('is true if any one of several pinned children is awaiting', async () => {
    const { awaitingRequiredFilters$, setChildren } = buildSetup(['control1', 'control2']);
    const first$ = new BehaviorSubject<boolean>(false);
    const second$ = new BehaviorSubject<boolean>(true);
    setChildren([
      { uuid: 'control1', awaitingRequiredFilters$: first$ },
      { uuid: 'control2', awaitingRequiredFilters$: second$ },
    ]);
    await flush();
    expect(awaitingRequiredFilters$.value).toBe(true);

    second$.next(false);
    await flush();
    expect(awaitingRequiredFilters$.value).toBe(false);
  });

  test('ignores children that are not pinned', async () => {
    const { awaitingRequiredFilters$, setChildren } = buildSetup(['control1']);
    setChildren([
      { uuid: 'control1', awaitingRequiredFilters$: new BehaviorSubject<boolean>(false) },
      { uuid: 'gridPanel', awaitingRequiredFilters$: new BehaviorSubject<boolean>(true) },
    ]);
    await flush();
    expect(awaitingRequiredFilters$.value).toBe(false);
  });

  test('re-evaluates when a mounted panel becomes pinned', async () => {
    const { awaitingRequiredFilters$, layout$, setChildren } = buildSetup([]);
    setChildren([
      { uuid: 'control1', awaitingRequiredFilters$: new BehaviorSubject<boolean>(true) },
    ]);
    await flush();
    expect(awaitingRequiredFilters$.value).toBe(false);

    layout$.next({ ...layout$.value, pinnedPanels: { control1: { order: 0 } } });
    await flush();
    expect(awaitingRequiredFilters$.value).toBe(true);
  });

  test('re-evaluates when a pinned panel is unpinned', async () => {
    const { awaitingRequiredFilters$, layout$, setChildren } = buildSetup(['control1']);
    setChildren([
      { uuid: 'control1', awaitingRequiredFilters$: new BehaviorSubject<boolean>(true) },
    ]);
    await flush();
    expect(awaitingRequiredFilters$.value).toBe(true);

    layout$.next({ ...layout$.value, pinnedPanels: {} });
    await flush();
    expect(awaitingRequiredFilters$.value).toBe(false);
  });

  test('stops tracking children after cleanup', async () => {
    const { filtersManager, awaitingRequiredFilters$, setChildren } = buildSetup(['control1']);
    const awaiting$ = new BehaviorSubject<boolean>(true);
    setChildren([{ uuid: 'control1', awaitingRequiredFilters$: awaiting$ }]);
    await flush();
    expect(awaitingRequiredFilters$.value).toBe(true);

    filtersManager.cleanup();
    awaiting$.next(false);
    await flush();
    expect(awaitingRequiredFilters$.value).toBe(true);
  });

  test('only changes the awaiting state once the filters are published', async () => {
    const { filtersManager, awaitingRequiredFilters$, setChildren } = buildSetup(
      ['control1'],
      false
    );
    const region = { meta: { key: 'region' }, query: { match_phrase: { region: 'EU' } } } as Filter;
    const awaiting$ = new BehaviorSubject<boolean>(false);
    const appliedFilters$ = new BehaviorSubject<Filter[] | undefined>(undefined);
    setChildren([
      {
        uuid: 'control1',
        awaitingRequiredFilters$: awaiting$,
        filtersLoading$: new BehaviorSubject<boolean>(false),
        appliedFilters$,
      },
    ]);
    appliedFilters$.next([region]);
    await flush();
    expect(filtersManager.api.publishedChildFilters$.value).toEqual([region]);

    // the required selection is cleared, but the cleared filters are not yet published
    appliedFilters$.next(undefined);
    awaiting$.next(true);
    await flush();
    expect(awaitingRequiredFilters$.value).toBe(false);

    filtersManager.api.publishFilters();
    await flush();
    expect(awaitingRequiredFilters$.value).toBe(true);

    // a new selection is made, but it is not yet published
    appliedFilters$.next([region]);
    awaiting$.next(false);
    await flush();
    expect(awaitingRequiredFilters$.value).toBe(true);
    expect(filtersManager.api.publishedChildFilters$.value).toBeUndefined();

    filtersManager.api.publishFilters();
    await flush();
    expect(awaitingRequiredFilters$.value).toBe(false);
    expect(filtersManager.api.publishedChildFilters$.value).toEqual([region]);
  });

  test('keeps waiting for publish when a control derives awaiting from its own appliedFilters$', async () => {
    const { filtersManager, awaitingRequiredFilters$, setChildren } = buildSetup(
      ['control1'],
      false
    );
    const region = { meta: { key: 'region' }, query: { match_phrase: { region: 'EU' } } } as Filter;
    const appliedFilters$ = new BehaviorSubject<Filter[] | undefined>([region]);
    const awaiting$ = new BehaviorSubject<boolean>(false);
    // like a real control, awaiting is a subscriber of appliedFilters$ and so emits before the dashboard sees the new filters
    appliedFilters$.subscribe((applied) => awaiting$.next((applied ?? []).length === 0));
    setChildren([
      {
        uuid: 'control1',
        awaitingRequiredFilters$: awaiting$,
        filtersLoading$: new BehaviorSubject<boolean>(false),
        appliedFilters$,
      },
    ]);
    await flush();
    filtersManager.api.publishFilters();
    await flush();
    expect(awaitingRequiredFilters$.value).toBe(false);

    // the selection is cleared, but not yet published: the grid must keep showing the published filters
    appliedFilters$.next(undefined);
    await flush();
    expect(awaitingRequiredFilters$.value).toBe(false);

    filtersManager.api.publishFilters();
    await flush();
    expect(awaitingRequiredFilters$.value).toBe(true);
  });

  describe.each([
    ['children finish loading before they mount', false],
    ['children are still loading when they mount', true],
  ])('auto-apply off, two required controls, %s', (_title, loadingOnMount) => {
    test('the first selection after load is not published automatically', async () => {
      const { filtersManager, awaitingRequiredFilters$, setChildren } = buildSetup(
        ['control1', 'control2'],
        false,
        true // resolved from the saved state before any control mounts
      );
      const region = {
        meta: { key: 'region' },
        query: { match_phrase: { region: 'EU' } },
      } as Filter;
      const buildControl = (uuid: string) => ({
        uuid,
        awaitingRequiredFilters$: new BehaviorSubject<boolean>(true),
        filtersLoading$: new BehaviorSubject<boolean>(loadingOnMount),
        appliedFilters$: new BehaviorSubject<Filter[] | undefined>(undefined),
      });
      const control1 = buildControl('control1');
      const control2 = buildControl('control2');
      setChildren([control1]);
      // the initial value holds until every pinned control has mounted, even if it is still loading
      expect(awaitingRequiredFilters$.value).toBe(true);
      await flush();
      expect(awaitingRequiredFilters$.value).toBe(true);
      setChildren([control1, control2]);
      await flush();
      // the grid stays hidden once the required controls mount, even if they are still loading
      expect(awaitingRequiredFilters$.value).toBe(true);
      control1.filtersLoading$.next(false);
      control2.filtersLoading$.next(false);
      await flush();
      expect(awaitingRequiredFilters$.value).toBe(true);

      control1.filtersLoading$.next(true);
      control1.appliedFilters$.next([region]);
      control1.awaitingRequiredFilters$.next(false);
      control1.filtersLoading$.next(false);
      await flush();
      expect(filtersManager.api.unpublishedChildFilters$.value).toEqual([region]);
      expect(filtersManager.api.publishedChildFilters$.value).toBeUndefined();
      expect(awaitingRequiredFilters$.value).toBe(true);
    });
  });

  describe('until every pinned control has mounted', () => {
    test('keeps the initial value instead of reflecting the mounted subset of controls', async () => {
      const { filtersManager, awaitingRequiredFilters$, setChildren } = buildSetup(
        ['control1', 'control2'],
        true,
        true
      );
      const region = {
        meta: { key: 'region' },
        query: { match_phrase: { region: 'EU' } },
      } as Filter;
      const appliedFilters$ = new BehaviorSubject<Filter[] | undefined>(undefined);
      setChildren([
        {
          uuid: 'control1',
          awaitingRequiredFilters$: new BehaviorSubject<boolean>(false),
          filtersLoading$: new BehaviorSubject<boolean>(false),
          appliedFilters$,
        },
      ]);
      await flush();
      expect(awaitingRequiredFilters$.value).toBe(true);

      // publishing while control2 is still unmounted must not reveal the grid either
      appliedFilters$.next([region]);
      await flush();
      expect(filtersManager.api.publishedChildFilters$.value).toEqual([region]);
      expect(awaitingRequiredFilters$.value).toBe(true);

      setChildren([
        {
          uuid: 'control1',
          awaitingRequiredFilters$: new BehaviorSubject<boolean>(false),
          filtersLoading$: new BehaviorSubject<boolean>(false),
          appliedFilters$,
        },
        { uuid: 'control2', awaitingRequiredFilters$: new BehaviorSubject<boolean>(false) },
      ]);
      await flush();
      expect(awaitingRequiredFilters$.value).toBe(false);
    });

    test('does not revert to the initial value when a pinned control is added after the first mount', async () => {
      const { awaitingRequiredFilters$, layout$, setChildren } = buildSetup(
        ['control1'],
        true,
        true
      );
      setChildren([
        { uuid: 'control1', awaitingRequiredFilters$: new BehaviorSubject<boolean>(false) },
      ]);
      await flush();
      expect(awaitingRequiredFilters$.value).toBe(false);

      // a new pinned control is in the layout but has not registered its api yet
      layout$.next({
        ...layout$.value,
        pinnedPanels: { control1: { order: 0 }, control2: { order: 1 } },
      });
      await flush();
      expect(awaitingRequiredFilters$.value).toBe(false);

      setChildren([
        { uuid: 'control1', awaitingRequiredFilters$: new BehaviorSubject<boolean>(false) },
        { uuid: 'control2', awaitingRequiredFilters$: new BehaviorSubject<boolean>(true) },
      ]);
      await flush();
      expect(awaitingRequiredFilters$.value).toBe(true);
    });
  });

  test('childFiltersLoading$ is true while awaiting required filters, even if no child is loading', async () => {
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
    await flush();
    expect(loadingStates.at(-1)).toBe(true);

    awaiting$.next(false);
    await flush();
    expect(loadingStates.at(-1)).toBe(false);
  });

  test('publishes child filters while awaiting required filters, and when a selection is cleared', async () => {
    const { filtersManager, setChildren } = buildSetup(['control1']);
    const appliedFilters$ = new BehaviorSubject<Filter[] | undefined>(undefined);
    setChildren([
      {
        uuid: 'control1',
        awaitingRequiredFilters$: new BehaviorSubject<boolean>(true), // still awaiting a required selection
        filtersLoading$: new BehaviorSubject<boolean>(false),
        appliedFilters$,
      },
    ]);

    const region = { meta: { key: 'region' }, query: { match_phrase: { region: 'EU' } } } as Filter;
    appliedFilters$.next([region]);
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(filtersManager.api.publishedChildFilters$.value).toEqual([region]);

    appliedFilters$.next(undefined);
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(filtersManager.api.publishedChildFilters$.value).toBeUndefined();
  });
});
