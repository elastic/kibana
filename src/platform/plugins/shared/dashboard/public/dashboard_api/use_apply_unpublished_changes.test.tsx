/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { BehaviorSubject } from 'rxjs';
import { act, renderHook } from '@testing-library/react';

import type { DashboardState } from '@kbn/as-code-dashboard-schema';
import type { DefaultEmbeddableApi } from '@kbn/embeddable-plugin/public';
import type { Filter } from '@kbn/es-query';

import { buildMockDashboardApi } from '../mocks';
import { DashboardContext } from './use_dashboard_api';
import { DashboardInternalContext } from './use_dashboard_internal_api';
import { useApplyUnpublishedChanges } from './use_apply_unpublished_changes';

const CONTROL_ID = 'control1';
const region = { meta: { key: 'region' }, query: { match_phrase: { region: 'EU' } } } as Filter;

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));
const flush = () => new Promise((resolve) => setTimeout(resolve, 10));

describe('useApplyUnpublishedChanges', () => {
  test('does not flash unpublished changes when a selection is made and then undone', async () => {
    const { api, internalApi } = buildMockDashboardApi({
      overrides: {
        options: { auto_apply_filters: false },
        pinned_panels: [{ id: CONTROL_ID, type: 'fakeControl', config: {}, order: 0 }],
      } as unknown as Partial<DashboardState>,
    });
    const filtersLoading$ = new BehaviorSubject<boolean>(false);
    const appliedFilters$ = new BehaviorSubject<Filter[] | undefined>(undefined);
    api.registerChildApi({
      uuid: CONTROL_ID,
      type: 'fakeControl',
      filtersLoading$,
      appliedFilters$,
    } as unknown as DefaultEmbeddableApi);

    // every value the hook renders with, in order
    const rendered: boolean[] = [];
    renderHook(
      () => {
        const { hasUnpublishedChanges } = useApplyUnpublishedChanges();
        if (rendered.at(-1) !== hasUnpublishedChanges) rendered.push(hasUnpublishedChanges);
      },
      {
        wrapper: ({ children }: { children: React.ReactNode }) => (
          <DashboardContext.Provider value={api}>
            <DashboardInternalContext.Provider value={internalApi}>
              {children}
            </DashboardInternalContext.Provider>
          </DashboardContext.Provider>
        ),
      }
    );
    await act(flush);
    expect(rendered).toEqual([false]);

    // like a real control: it flags that it is loading as soon as its selection changes, and outputs its filter later
    const select = async (filters: Filter[] | undefined) => {
      await act(async () => {
        filtersLoading$.next(true);
        await tick();
      });
      await act(async () => {
        appliedFilters$.next(filters);
        filtersLoading$.next(false);
      });
      await act(flush);
    };

    await select([region]);
    expect(rendered).toEqual([false, true]);

    await select(undefined);
    expect(rendered).toEqual([false, true, false]);
  });
});
