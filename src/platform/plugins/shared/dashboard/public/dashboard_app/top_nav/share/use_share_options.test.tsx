/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { renderHook } from '@testing-library/react';
import { BehaviorSubject } from 'rxjs';

import type { DashboardState } from '../../../../common/types';
import { DashboardContext } from '../../../dashboard_api/use_dashboard_api';
import { DashboardInternalContext } from '../../../dashboard_api/use_dashboard_internal_api';
import type { DashboardInternalApi } from '../../../dashboard_api/types';
import { buildMockDashboardApi } from '../../../mocks';
import { useShareOptions } from './use_share_options';

describe('useShareOptions', () => {
  function buildWrapper(unsavedChanges$: BehaviorSubject<Partial<DashboardState>>) {
    const { api, internalApi } = buildMockDashboardApi({ savedObjectId: 'test-id' });
    const mockInternalApi = {
      ...internalApi,
      unsavedChanges$,
    } as unknown as DashboardInternalApi;

    return ({ children }: { children: React.ReactNode }) => (
      <DashboardContext.Provider value={api}>
        <DashboardInternalContext.Provider value={mockInternalApi}>
          {children}
        </DashboardInternalContext.Provider>
      </DashboardContext.Provider>
    );
  }

  it('locatorParams unsaved state is properly propagated to locator', () => {
    const unsavedDashboardState: Partial<DashboardState> = {
      panels: [
        {
          type: 'panel_type',
          grid: { w: 0, h: 0, x: 0, y: 0 },
          config: {
            id: 'superPanel',
          },
        },
      ],
      filters: [
        {
          type: 'condition',
          condition: {
            field: 'status',
            operator: 'is',
            value: 'active',
          },
        },
      ],
      query: { expression: 'bye', language: 'kql' },
    };
    const unsavedChanges$ = new BehaviorSubject<Partial<DashboardState>>(unsavedDashboardState);
    const { result } = renderHook(() => useShareOptions(), {
      wrapper: buildWrapper(unsavedChanges$),
    });

    const shareLocatorParams = result.current.sharingData.locatorParams.params;
    expect(shareLocatorParams.panels).toStrictEqual(unsavedDashboardState.panels);
    // Query in the locator params is in the storedQuery format
    expect(shareLocatorParams.query).toMatchInlineSnapshot(`
      Object {
        "language": "kuery",
        "query": "bye",
      }
    `);
    // Filters in the locator params are in the storedFilter format
    expect(shareLocatorParams.filters).toMatchInlineSnapshot(`
      Array [
        Object {
          "meta": Object {
            "field": "status",
            "key": "status",
            "params": Object {
              "query": "active",
            },
            "type": "phrase",
          },
          "query": Object {
            "match_phrase": Object {
              "status": "active",
            },
          },
        },
      ]
    `);
  });
});
