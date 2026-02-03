/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook, act } from '@testing-library/react';
import { discoverServiceMock } from '../../../__mocks__/services';
import { useInspector } from './use_inspector';
import type { Adapters } from '@kbn/inspector-plugin/common';
import { RequestAdapter } from '@kbn/inspector-plugin/common';
import type { OverlayRef } from '@kbn/core/public';
import { AggregateRequestAdapter } from '../utils/aggregate_request_adapter';
import { getDiscoverStateMock } from '../../../__mocks__/discover_state.mock';
import type { DataTableRecord } from '@kbn/discover-utils/types';
import { internalStateActions } from '../state_management/redux';
import React from 'react';
import { DiscoverTestProvider } from '../../../__mocks__/test_provider';

describe('test useInspector', () => {
  test('inspector open function is executed, expanded doc is closed', async () => {
    let adapters: Adapters | undefined;
    jest.spyOn(discoverServiceMock.inspector, 'open').mockImplementation((localAdapters) => {
      adapters = localAdapters;
      return { close: jest.fn() } as unknown as OverlayRef;
    });
    const requests = new RequestAdapter();
    const lensRequests = new RequestAdapter();
    const stateContainer = getDiscoverStateMock({ isTimeBased: true });
    const currentTabId = stateContainer.internalState.getState().tabs.unsafeCurrentId;
    stateContainer.internalState.dispatch(
      internalStateActions.setExpandedDoc({
        tabId: currentTabId,
        expandedDoc: {} as unknown as DataTableRecord,
      })
    );
    const { result } = renderHook(
      () => {
        return useInspector({
          stateContainer,
          inspector: discoverServiceMock.inspector,
        });
      },
      {
        wrapper: ({ children }) => (
          <DiscoverTestProvider stateContainer={stateContainer}>{children}</DiscoverTestProvider>
        ),
      }
    );
    await act(async () => {
      result.current();
    });

    expect(discoverServiceMock.inspector.open).toHaveBeenCalled();
    expect(adapters?.requests).toBeInstanceOf(AggregateRequestAdapter);
    expect(adapters?.requests?.getRequests()).toEqual([
      ...requests.getRequests(),
      ...lensRequests.getRequests(),
    ]);
    const state = stateContainer.internalState.getState();
    const tab = state.tabs.byId[currentTabId];
    expect(tab.expandedDoc).toBe(undefined);
  });
});
