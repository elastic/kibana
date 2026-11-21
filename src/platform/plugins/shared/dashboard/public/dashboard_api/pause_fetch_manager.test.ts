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
import { initializePauseFetchManager } from './pause_fetch_manager';

type FiltersManagerArgs = Parameters<typeof initializeFiltersManager>;

const setup = (children: Record<string, unknown>) => {
  const filtersManager = initializeFiltersManager(
    {
      internalApi: { unifiedSearchFilters$: new BehaviorSubject([]) },
    } as unknown as FiltersManagerArgs[0],
    {
      api: { children$: new BehaviorSubject(children) },
      internalApi: { childrenLoading$: new BehaviorSubject(false) },
    } as unknown as FiltersManagerArgs[1],
    {
      api: { settings: { autoApplyFilters$: new BehaviorSubject(true) } },
    } as unknown as FiltersManagerArgs[2],
    new Subject<void>()
  );
  return { filtersManager, ...initializePauseFetchManager(filtersManager) };
};

describe('initializePauseFetchManager', () => {
  test('unpauses right away when no child filters are loading', () => {
    const { api } = setup({});

    expect(api.isFetchPaused$.value).toBe(false);
  });

  test('unpauses once the restored control filters reach the dashboard', () => {
    jest.useFakeTimers();
    const controlFilter: Filter = { meta: {} };
    const filtersLoading$ = new BehaviorSubject(true);
    const appliedFilters$ = new BehaviorSubject<Filter[] | undefined>([controlFilter]);
    const { api, filtersManager } = setup({ control: { filtersLoading$, appliedFilters$ } });
    let filtersOnUnpause: Filter[] | undefined;
    api.isFetchPaused$.subscribe((paused) => {
      if (!paused) filtersOnUnpause = filtersManager.api.filters$.value;
    });

    filtersLoading$.next(false);
    jest.runAllTimers();

    expect(filtersOnUnpause).toEqual([controlFilter]);
    jest.useRealTimers();
  });
});
