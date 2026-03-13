/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook, act } from '@testing-library/react';
import { useInspector } from './use_inspector';
import type { Adapters } from '@kbn/inspector-plugin/common';
import { RequestAdapter } from '@kbn/inspector-plugin/common';
import type { OverlayRef } from '@kbn/core/public';
import { AggregateRequestAdapter } from '../utils/aggregate_request_adapter';
import { getDiscoverInternalStateMock } from '../../../__mocks__/discover_state.mock';
import type { DataTableRecord } from '@kbn/discover-utils/types';
import { internalStateActions } from '../state_management/redux';
import React from 'react';
import { DiscoverToolkitTestProvider } from '../../../__mocks__/test_provider';
import { createDiscoverServicesMock } from '../../../__mocks__/services';

describe('test useInspector', () => {
  test('inspector open function is executed, expanded doc is closed', async () => {
    const services = createDiscoverServicesMock();
    let adapters: Adapters | undefined;
    jest.spyOn(services.inspector, 'open').mockImplementation((localAdapters) => {
      adapters = localAdapters;
      return { close: jest.fn() } as unknown as OverlayRef;
    });
    const requests = new RequestAdapter();
    const lensRequests = new RequestAdapter();
    const toolkit = getDiscoverInternalStateMock({ services });
    await toolkit.initializeTabs();
    const { stateContainer } = await toolkit.initializeSingleTab({
      tabId: toolkit.getCurrentTab().id,
    });
    toolkit.internalState.dispatch(
      internalStateActions.setExpandedDoc({
        tabId: toolkit.getCurrentTab().id,
        expandedDoc: {} as unknown as DataTableRecord,
      })
    );
    const { result } = renderHook(
      () => {
        return useInspector({
          stateContainer,
          inspector: services.inspector,
        });
      },
      {
        wrapper: ({ children }) => (
          <DiscoverToolkitTestProvider toolkit={toolkit}>{children}</DiscoverToolkitTestProvider>
        ),
      }
    );
    await act(async () => {
      result.current();
    });

    expect(services.inspector.open).toHaveBeenCalled();
    expect(adapters?.requests).toBeInstanceOf(AggregateRequestAdapter);
    expect(adapters?.requests?.getRequests()).toEqual([
      ...requests.getRequests(),
      ...lensRequests.getRequests(),
    ]);
    expect(toolkit.getCurrentTab().expandedDoc).toBe(undefined);
  });
});
