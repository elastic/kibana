/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { createFilterManagerMock } from '@kbn/data-plugin/public/query/filter_manager/filter_manager.mock';
import { CONTEXT_TIE_BREAKER_FIELDS_SETTING } from '@kbn/discover-utils';
import { DiscoverServices } from '../../../build_services';
import { FailureReason, LoadingStatus } from '../services/context_query_state';
import { ContextAppFetchProps, useContextAppFetch } from './use_context_app_fetch';
import {
  mockAnchorHit,
  mockPredecessorHits,
  mockSuccessorHits,
} from '../__mocks__/use_context_app_fetch';
import { dataViewWithTimefieldMock } from '../../../__mocks__/data_view_with_timefield';
import { searchResponseIncompleteWarningLocalCluster } from '@kbn/search-response-warnings/src/__mocks__/search_response_warnings';
import { createContextSearchSourceStub } from '../services/_stubs';
import { DataView } from '@kbn/data-views-plugin/public';
import { themeServiceMock } from '@kbn/core/public/mocks';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';

const mockInterceptedWarning = {
  originalWarning: searchResponseIncompleteWarningLocalCluster,
};

const mockFilterManager = createFilterManagerMock();

let mockOverrideInterceptedWarnings = false;

jest.mock('../services/context', () => {
  const originalModule = jest.requireActual('../services/context');
  return {
    ...originalModule,

    fetchSurroundingDocs: (type: string, dataView: DataView) => {
      if (!dataView || !dataView.id) {
        throw new Error();
      }
      return {
        rows: type === 'predecessors' ? mockPredecessorHits : mockSuccessorHits,
        interceptedWarnings: mockOverrideInterceptedWarnings ? [mockInterceptedWarning] : undefined,
      };
    },
  };
});

jest.mock('../services/anchor', () => ({
  fetchAnchor: (anchorId: string, dataView: DataView) => {
    if (!dataView.id || !anchorId) {
      throw new Error();
    }
    return {
      anchorRow: mockAnchorHit,
      interceptedWarnings: mockOverrideInterceptedWarnings ? [mockInterceptedWarning] : undefined,
    };
  },
}));

const initDefaults = (tieBreakerFields: string[], dataViewId = 'the-data-view-id') => {
  const dangerNotification = jest.fn();
  const mockSearchSource = createContextSearchSourceStub('timestamp');

  const services = {
    data: {
      search: {
        searchSource: {
          createEmpty: jest.fn().mockImplementation(() => mockSearchSource),
        },
      },
    },
    toastNotifications: { addDanger: dangerNotification },
    core: {
      notifications: { toasts: [] },
      theme: { theme$: themeServiceMock.createStartContract().theme$ },
    },
    history: () => {},
    filterManager: mockFilterManager,
    uiSettings: {
      get: (key: string) => {
        if (key === CONTEXT_TIE_BREAKER_FIELDS_SETTING) {
          return tieBreakerFields;
        }
      },
    },
  } as unknown as DiscoverServices;

  const props = {
    dangerNotification,
    props: {
      anchorId: 'mock_anchor_id',
      dataView: { ...dataViewWithTimefieldMock, id: dataViewId },
      appState: {
        predecessorCount: 2,
        successorCount: 2,
      },
      useNewFieldsApi: false,
    } as ContextAppFetchProps,
  };

  return {
    result: renderHook(() => useContextAppFetch(props.props), {
      wrapper: ({ children }: React.PropsWithChildren<{}>) => (
        <KibanaContextProvider services={services}>{children}</KibanaContextProvider>
      ),
    }).result,
    dangerNotification,
  };
};

describe('test useContextAppFetch', () => {
  it('should fetch all correctly', async () => {
    const { result } = initDefaults(['_doc']);

    expect(result.current.fetchedState.anchorStatus.value).toBe(LoadingStatus.UNINITIALIZED);
    expect(result.current.fetchedState.predecessorsStatus.value).toBe(LoadingStatus.UNINITIALIZED);
    expect(result.current.fetchedState.successorsStatus.value).toBe(LoadingStatus.UNINITIALIZED);

    await act(async () => {
      await result.current.fetchAllRows();
    });

    expect(result.current.fetchedState.anchorStatus.value).toBe(LoadingStatus.LOADED);
    expect(result.current.fetchedState.predecessorsStatus.value).toBe(LoadingStatus.LOADED);
    expect(result.current.fetchedState.successorsStatus.value).toBe(LoadingStatus.LOADED);
    expect(result.current.fetchedState.anchor).toEqual({ ...mockAnchorHit, isAnchor: true });
    expect(result.current.fetchedState.predecessors).toEqual(mockPredecessorHits);
    expect(result.current.fetchedState.successors).toEqual(mockSuccessorHits);
    expect(result.current.fetchedState.predecessorsInterceptedWarnings).toBeUndefined();
    expect(result.current.fetchedState.successorsInterceptedWarnings).toBeUndefined();
    expect(result.current.fetchedState.anchorInterceptedWarnings).toBeUndefined();
  });

  it('should set anchorStatus to failed when tieBreakingField array is empty', async () => {
    const { result } = initDefaults([]);

    expect(result.current.fetchedState.anchorStatus.value).toBe(LoadingStatus.UNINITIALIZED);

    await act(async () => {
      await result.current.fetchAllRows();
    });

    expect(result.current.fetchedState.anchorStatus.value).toBe(LoadingStatus.FAILED);
    expect(result.current.fetchedState.anchorStatus.reason).toBe(FailureReason.INVALID_TIEBREAKER);
    expect(result.current.fetchedState.anchor).toEqual({});
    expect(result.current.fetchedState.predecessors).toEqual([]);
    expect(result.current.fetchedState.successors).toEqual([]);
  });

  it('should set anchorStatus to failed when invalid dataViewId provided', async () => {
    const { result, dangerNotification } = initDefaults(['_doc'], '');

    expect(result.current.fetchedState.anchorStatus.value).toBe(LoadingStatus.UNINITIALIZED);

    await act(async () => {
      await result.current.fetchAllRows();
    });

    expect(dangerNotification.mock.calls.length).toBe(1);
    expect(result.current.fetchedState.anchorStatus.value).toBe(LoadingStatus.FAILED);
    expect(result.current.fetchedState.anchorStatus.reason).toBe(FailureReason.UNKNOWN);
    expect(result.current.fetchedState.anchor).toEqual({});
    expect(result.current.fetchedState.predecessors).toEqual([]);
    expect(result.current.fetchedState.successors).toEqual([]);
  });

  it('should fetch context rows correctly', async () => {
    const { result } = initDefaults(['_doc']);

    expect(result.current.fetchedState.predecessorsStatus.value).toBe(LoadingStatus.UNINITIALIZED);
    expect(result.current.fetchedState.successorsStatus.value).toBe(LoadingStatus.UNINITIALIZED);

    await act(async () => {
      await result.current.fetchContextRows(mockAnchorHit);
    });

    expect(result.current.fetchedState.predecessorsStatus.value).toBe(LoadingStatus.LOADED);
    expect(result.current.fetchedState.successorsStatus.value).toBe(LoadingStatus.LOADED);
    expect(result.current.fetchedState.predecessors).toEqual(mockPredecessorHits);
    expect(result.current.fetchedState.successors).toEqual(mockSuccessorHits);
  });

  it('should set context rows statuses to failed when invalid dataViewId provided', async () => {
    const { result, dangerNotification } = initDefaults(['_doc'], '');

    expect(result.current.fetchedState.predecessorsStatus.value).toBe(LoadingStatus.UNINITIALIZED);
    expect(result.current.fetchedState.successorsStatus.value).toBe(LoadingStatus.UNINITIALIZED);

    await act(async () => {
      await result.current.fetchContextRows(mockAnchorHit);
    });

    expect(dangerNotification.mock.calls.length).toBe(2); // for successors and predecessors
    expect(result.current.fetchedState.predecessorsStatus.value).toBe(LoadingStatus.FAILED);
    expect(result.current.fetchedState.successorsStatus.value).toBe(LoadingStatus.FAILED);
    expect(result.current.fetchedState.successorsStatus.reason).toBe(FailureReason.UNKNOWN);
    expect(result.current.fetchedState.successorsStatus.reason).toBe(FailureReason.UNKNOWN);
    expect(result.current.fetchedState.predecessors).toEqual([]);
    expect(result.current.fetchedState.successors).toEqual([]);
  });

  it('should handle warnings', async () => {
    mockOverrideInterceptedWarnings = true;

    const { result } = initDefaults(['_doc']);

    expect(result.current.fetchedState.anchorStatus.value).toBe(LoadingStatus.UNINITIALIZED);
    expect(result.current.fetchedState.predecessorsStatus.value).toBe(LoadingStatus.UNINITIALIZED);
    expect(result.current.fetchedState.successorsStatus.value).toBe(LoadingStatus.UNINITIALIZED);

    await act(async () => {
      await result.current.fetchAllRows();
    });

    expect(result.current.fetchedState.anchorStatus.value).toBe(LoadingStatus.LOADED);
    expect(result.current.fetchedState.predecessorsStatus.value).toBe(LoadingStatus.LOADED);
    expect(result.current.fetchedState.successorsStatus.value).toBe(LoadingStatus.LOADED);
    expect(result.current.fetchedState.anchor).toEqual({ ...mockAnchorHit, isAnchor: true });
    expect(result.current.fetchedState.predecessors).toEqual(mockPredecessorHits);
    expect(result.current.fetchedState.successors).toEqual(mockSuccessorHits);
    expect(result.current.fetchedState.predecessorsInterceptedWarnings).toEqual([
      mockInterceptedWarning,
    ]);
    expect(result.current.fetchedState.successorsInterceptedWarnings).toEqual([
      mockInterceptedWarning,
    ]);
    expect(result.current.fetchedState.anchorInterceptedWarnings).toEqual([mockInterceptedWarning]);
  });
});
