/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { act, renderHook } from '@testing-library/react-hooks';
import { setServices, getServices } from '../../../kibana_services';
import { createFilterManagerMock } from '../../../../../data/public/query/filter_manager/filter_manager.mock';
import { CONTEXT_TIE_BREAKER_FIELDS_SETTING } from '../../../../common';
import { DiscoverServices } from '../../../build_services';
import { FailureReason, LoadingStatus } from '../services/context_query_state';
import { ContextAppFetchProps, useContextAppFetch } from './use_context_app_fetch';
import {
  mockAnchorHit,
  mockPredecessorHits,
  mockSuccessorHits,
} from '../__mocks__/use_context_app_fetch';
import { indexPatternWithTimefieldMock } from '../../../__mocks__/index_pattern_with_timefield';
import { createContextSearchSourceStub } from '../services/_stubs';
import { IndexPattern } from '../../../../../data_views/common';

const mockFilterManager = createFilterManagerMock();

jest.mock('../services/context', () => {
  const originalModule = jest.requireActual('../services/context');
  return {
    ...originalModule,

    fetchSurroundingDocs: (type: string, indexPattern: IndexPattern) => {
      if (!indexPattern || !indexPattern.id) {
        throw new Error();
      }
      return type === 'predecessors' ? mockPredecessorHits : mockSuccessorHits;
    },
  };
});

jest.mock('../services/anchor', () => ({
  fetchAnchor: (anchorId: string, indexPattern: IndexPattern) => {
    if (!indexPattern.id || !anchorId) {
      throw new Error();
    }
    return mockAnchorHit;
  },
}));

const initDefaults = (tieBreakerFields: string[], indexPatternId = 'the-index-pattern-id') => {
  const dangerNotification = jest.fn();
  const mockSearchSource = createContextSearchSourceStub('timestamp');

  setServices({
    data: {
      search: {
        searchSource: {
          createEmpty: jest.fn().mockImplementation(() => mockSearchSource),
        },
      },
    },
    toastNotifications: { addDanger: dangerNotification },
    core: { notifications: { toasts: [] } },
    history: () => {},
    filterManager: mockFilterManager,
    uiSettings: {
      get: (key: string) => {
        if (key === CONTEXT_TIE_BREAKER_FIELDS_SETTING) {
          return tieBreakerFields;
        }
      },
    },
  } as unknown as DiscoverServices);

  return {
    dangerNotification,
    props: {
      anchorId: 'mock_anchor_id',
      indexPattern: { ...indexPatternWithTimefieldMock, id: indexPatternId },
      appState: {
        predecessorCount: 2,
        successorCount: 2,
      },
      useNewFieldsApi: false,
      services: getServices(),
    } as unknown as ContextAppFetchProps,
  };
};

describe('test useContextAppFetch', () => {
  it('should fetch all correctly', async () => {
    const { props } = initDefaults(['_doc']);

    const { result } = renderHook(() => {
      return useContextAppFetch(props);
    });

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
  });

  it('should set anchorStatus to failed when tieBreakingField array is empty', async () => {
    const { props } = initDefaults([]);

    const { result } = renderHook(() => {
      return useContextAppFetch(props);
    });

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

  it('should set anchorStatus to failed when invalid indexPatternId provided', async () => {
    const { props, dangerNotification } = initDefaults(['_doc'], '');

    const { result } = renderHook(() => {
      return useContextAppFetch(props);
    });

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
    const { props } = initDefaults(['_doc']);

    const { result } = renderHook(() => {
      return useContextAppFetch(props);
    });

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

  it('should set context rows statuses to failed when invalid indexPatternId provided', async () => {
    const { props, dangerNotification } = initDefaults(['_doc'], '');

    const { result } = renderHook(() => {
      return useContextAppFetch(props);
    });

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
});
