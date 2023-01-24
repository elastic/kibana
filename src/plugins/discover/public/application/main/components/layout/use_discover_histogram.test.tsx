/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { ReactElement } from 'react';
import { buildDataTableRecord } from '../../../../utils/build_data_record';
import { esHits } from '../../../../__mocks__/es_hits';
import { act, renderHook, WrapperComponent } from '@testing-library/react-hooks';
import { BehaviorSubject, map, Observable, Subject } from 'rxjs';
import { FetchStatus } from '../../../types';
import {
  AvailableFields$,
  DataDocuments$,
  DataFetch$,
  DataMain$,
  DataTotalHits$,
  RecordRawType,
} from '../../services/discover_data_state_container';
import type { DiscoverStateContainer } from '../../services/discover_state';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { dataViewWithTimefieldMock } from '../../../../__mocks__/data_view_with_timefield';
import { useDiscoverHistogram, UseDiscoverHistogramProps } from './use_discover_histogram';
import { setTimeout } from 'timers/promises';
import { getDiscoverStateMock } from '../../../../__mocks__/discover_state.mock';
import { DiscoverMainProvider } from '../../services/discover_state_provider';
import { createSearchSessionMock } from '../../../../__mocks__/search_session';
import { RequestAdapter } from '@kbn/inspector-plugin/public';
import { getSessionServiceMock } from '@kbn/data-plugin/public/search/session/mocks';
import {
  UnifiedHistogramApi,
  UnifiedHistogramFetchStatus,
  UnifiedHistogramInitializeOptions,
} from '@kbn/unified-histogram-plugin/public';
import { checkHitCount, sendErrorTo } from '../../hooks/use_saved_search_messages';
import type { InspectorAdapters } from '../../hooks/use_inspector';
import type { UnifiedHistogramState } from '@kbn/unified-histogram-plugin/public/container/services/state_service';

const mockData = dataPluginMock.createStartContract();
const mockQueryState = {
  query: {
    query: 'query',
    language: 'kuery',
  },
  filters: [],
  time: {
    from: 'now-15m',
    to: 'now',
  },
};

mockData.query.getState = () => mockQueryState;

jest.mock('../../../../hooks/use_discover_services', () => {
  const originalModule = jest.requireActual('../../../../hooks/use_discover_services');
  return {
    ...originalModule,
    useDiscoverServices: () => ({ data: mockData }),
  };
});

jest.mock('@kbn/unified-field-list-plugin/public', () => {
  const originalModule = jest.requireActual('@kbn/unified-field-list-plugin/public');
  return {
    ...originalModule,
    useQuerySubscriber: jest.fn(() => ({
      ...mockQueryState,
      fromDate: 'now-15m',
      toDate: 'now',
    })),
  };
});

jest.mock('../../hooks/use_saved_search_messages', () => {
  const originalModule = jest.requireActual('../../hooks/use_saved_search_messages');
  return {
    ...originalModule,
    checkHitCount: jest.fn(originalModule.checkHitCount),
    sendErrorTo: jest.fn(originalModule.sendErrorTo),
  };
});

const mockCheckHitCount = checkHitCount as jest.MockedFunction<typeof checkHitCount>;

describe('useDiscoverHistogram', () => {
  const getStateContainer = () => {
    const stateContainer = getDiscoverStateMock({ isTimeBased: true });
    stateContainer.setAppState({
      interval: 'auto',
      hideChart: false,
      breakdownField: 'extension',
    });
    const wrappedStateContainer = Object.create(stateContainer);
    wrappedStateContainer.setAppState = jest.fn((newState) => stateContainer.setAppState(newState));
    return wrappedStateContainer;
  };

  const renderUseDiscoverHistogram = async ({
    isPlainRecord = false,
    stateContainer = getStateContainer(),
    searchSessionId = '123',
    inspectorAdapters = { requests: new RequestAdapter() },
    totalHits$ = new BehaviorSubject({
      fetchStatus: FetchStatus.COMPLETE,
      result: Number(esHits.length),
    }) as DataTotalHits$,
    main$ = new BehaviorSubject({
      fetchStatus: FetchStatus.COMPLETE,
      recordRawType: isPlainRecord ? RecordRawType.PLAIN : RecordRawType.DOCUMENT,
      foundDocuments: true,
    }) as DataMain$,
    savedSearchFetch$ = new Subject() as DataFetch$,
  }: {
    isPlainRecord?: boolean;
    stateContainer?: DiscoverStateContainer;
    searchSessionId?: string | null;
    inspectorAdapters?: InspectorAdapters;
    totalHits$?: DataTotalHits$;
    main$?: DataMain$;
    savedSearchFetch$?: DataFetch$;
  } = {}) => {
    const documents$ = new BehaviorSubject({
      fetchStatus: FetchStatus.COMPLETE,
      result: esHits.map((esHit) => buildDataTableRecord(esHit, dataViewWithTimefieldMock)),
    }) as DataDocuments$;

    const availableFields$ = new BehaviorSubject({
      fetchStatus: FetchStatus.COMPLETE,
      fields: [] as string[],
    }) as AvailableFields$;

    const savedSearchData$ = {
      main$,
      documents$,
      totalHits$,
      availableFields$,
    };

    const session = getSessionServiceMock();
    session.getSession$.mockReturnValue(new BehaviorSubject(searchSessionId ?? undefined));
    const searchSessionManager = createSearchSessionMock(session).searchSessionManager;

    const initialProps = {
      stateContainer,
      savedSearchData$,
      savedSearchFetch$,
      dataView: dataViewWithTimefieldMock,
      isPlainRecord,
      inspectorAdapters,
      searchSessionManager: searchSessionManager!,
    };

    const Wrapper: WrapperComponent<UseDiscoverHistogramProps> = ({ children }) => (
      <DiscoverMainProvider value={stateContainer}>{children as ReactElement}</DiscoverMainProvider>
    );

    const hook = renderHook(
      (props: UseDiscoverHistogramProps) => {
        return useDiscoverHistogram(props);
      },
      {
        wrapper: Wrapper,
        initialProps,
      }
    );

    await act(() => setTimeout(0));

    return { hook, initialProps };
  };

  const createUnifiedHistogramApi = () => {
    const api: UnifiedHistogramApi = {
      initialized: false,
      initialize: jest.fn(() => {
        api.initialized = true;
      }),
      getState$: jest.fn(() => new Observable()),
      updateState: jest.fn(),
      refetch: jest.fn(),
    };
    return api;
  };

  describe('initialization', () => {
    it('should call initialize if there is a search session', async () => {
      const { hook } = await renderUseDiscoverHistogram();
      const api = createUnifiedHistogramApi();
      act(() => {
        hook.result.current.setUnifiedHistogramApi(api);
      });
      expect(api.initialize).toHaveBeenCalled();
    });

    it('should call initialize if there is no search session, but isPlainRecord is true', async () => {
      const { hook } = await renderUseDiscoverHistogram({
        searchSessionId: null,
        isPlainRecord: true,
      });
      const api = createUnifiedHistogramApi();
      act(() => {
        hook.result.current.setUnifiedHistogramApi(api);
      });
      expect(api.initialize).toHaveBeenCalled();
    });

    it('should not call initialize if there is no search session', async () => {
      const { hook } = await renderUseDiscoverHistogram({ searchSessionId: null });
      const api = createUnifiedHistogramApi();
      act(() => {
        hook.result.current.setUnifiedHistogramApi(api);
      });
      expect(api.initialize).not.toHaveBeenCalled();
    });

    it('should not call initialize again if already initialized', async () => {
      const { hook } = await renderUseDiscoverHistogram();
      const api = createUnifiedHistogramApi();
      api.initialized = true;
      act(() => {
        hook.result.current.setUnifiedHistogramApi(api);
      });
      expect(api.initialize).not.toHaveBeenCalled();
    });

    it('should pass the expected parameters to initialize', async () => {
      const { hook } = await renderUseDiscoverHistogram();
      const api = createUnifiedHistogramApi();
      let params: UnifiedHistogramInitializeOptions | undefined;
      api.initialize = jest.fn((p) => {
        params = p;
      });
      act(() => {
        hook.result.current.setUnifiedHistogramApi(api);
      });
      expect(api.initialize).toHaveBeenCalled();
      expect(params?.localStorageKeyPrefix).toBe('discover');
      expect(params?.disableAutoFetching).toBe(true);
      expect(Object.keys(params?.initialState ?? {})).toEqual([
        'dataView',
        'query',
        'filters',
        'timeRange',
        'chartHidden',
        'timeInterval',
        'breakdownField',
        'searchSessionId',
        'totalHitsStatus',
        'totalHitsResult',
        'requestAdapter',
      ]);
    });
  });

  describe('state', () => {
    it('should subscribe to state changes', async () => {
      const { hook } = await renderUseDiscoverHistogram();
      const api = createUnifiedHistogramApi();
      act(() => {
        hook.result.current.setUnifiedHistogramApi(api);
      });
      expect(api.getState$).toHaveBeenCalledTimes(2);
    });

    it('should sync Unified Histogram state with the state container', async () => {
      const stateContainer = getStateContainer();
      const inspectorAdapters = { requests: new RequestAdapter(), lensRequests: undefined };
      const { hook } = await renderUseDiscoverHistogram({ stateContainer, inspectorAdapters });
      const lensRequestAdapter = new RequestAdapter();
      const state = {
        timeInterval: '1m',
        chartHidden: true,
        breakdownField: 'test',
        totalHitsStatus: UnifiedHistogramFetchStatus.loading,
        totalHitsResult: undefined,
      } as unknown as UnifiedHistogramState;
      const api = createUnifiedHistogramApi();
      api.getState$ = jest.fn((selector) => {
        const returnedState = { ...state, lensRequestAdapter };
        if (selector) {
          return new BehaviorSubject(selector(returnedState));
        }
        return new BehaviorSubject(returnedState);
      }) as typeof api['getState$'];
      act(() => {
        hook.result.current.setUnifiedHistogramApi(api);
      });
      expect(inspectorAdapters.lensRequests).toBe(lensRequestAdapter);
      expect(stateContainer.setAppState).toHaveBeenCalledWith({
        interval: state.timeInterval,
        hideChart: state.chartHidden,
        breakdownField: state.breakdownField,
      });
    });

    it('should not sync Unified Histogram state with the state container if there are no changes', async () => {
      const stateContainer = getStateContainer();
      const { hook } = await renderUseDiscoverHistogram({ stateContainer });
      const containerState = stateContainer.appState.getState();
      const state = {
        timeInterval: containerState.interval,
        chartHidden: containerState.hideChart,
        breakdownField: containerState.breakdownField,
        totalHitsStatus: UnifiedHistogramFetchStatus.loading,
        totalHitsResult: undefined,
      } as unknown as UnifiedHistogramState;
      const api = createUnifiedHistogramApi();
      api.getState$ = jest.fn((selector) => {
        if (selector) {
          return new BehaviorSubject(selector(state));
        }
        return new BehaviorSubject(state);
      }) as typeof api['getState$'];
      act(() => {
        hook.result.current.setUnifiedHistogramApi(api);
      });
      expect(stateContainer.setAppState).not.toHaveBeenCalled();
    });

    it('should sync the state container state with Unified Histogram', async () => {
      const stateContainer = getStateContainer();
      const { hook } = await renderUseDiscoverHistogram({ stateContainer });
      const api = createUnifiedHistogramApi();
      let params: Partial<UnifiedHistogramState> | undefined;
      api.updateState = jest.fn((p) => {
        params = p;
      });
      act(() => {
        hook.result.current.setUnifiedHistogramApi(api);
      });
      expect(api.updateState).toHaveBeenCalled();
      expect(Object.keys(params ?? {})).toEqual([
        'dataView',
        'query',
        'filters',
        'timeRange',
        'searchSessionId',
        'requestAdapter',
        'totalHitsStatus',
        'totalHitsResult',
      ]);
    });

    it('should exclude totalHitsStatus and totalHitsResult from Unified Histogram state updates after the first load', async () => {
      const stateContainer = getStateContainer();
      const { hook } = await renderUseDiscoverHistogram({ stateContainer });
      const containerState = stateContainer.appState.getState();
      const state = {
        timeInterval: containerState.interval,
        chartHidden: containerState.hideChart,
        breakdownField: containerState.breakdownField,
        totalHitsStatus: UnifiedHistogramFetchStatus.loading,
        totalHitsResult: undefined,
      } as unknown as UnifiedHistogramState;
      const api = createUnifiedHistogramApi();
      let params: Partial<UnifiedHistogramState> | undefined;
      api.updateState = jest.fn((p) => {
        params = p;
      });
      const subject$ = new BehaviorSubject(state);
      api.getState$ = jest.fn((selector) => {
        if (selector) {
          return subject$.pipe(map(selector));
        }
        return subject$;
      }) as typeof api['getState$'];
      act(() => {
        hook.result.current.setUnifiedHistogramApi(api);
      });
      expect(Object.keys(params ?? {})).toEqual([
        'dataView',
        'query',
        'filters',
        'timeRange',
        'searchSessionId',
        'requestAdapter',
        'totalHitsStatus',
        'totalHitsResult',
      ]);
      act(() => {
        subject$.next({
          ...state,
          totalHitsStatus: UnifiedHistogramFetchStatus.complete,
          totalHitsResult: 100,
        });
      });
      expect(Object.keys(params ?? {})).toEqual([
        'dataView',
        'query',
        'filters',
        'timeRange',
        'searchSessionId',
        'requestAdapter',
      ]);
    });

    it('should update total hits when the total hits state changes', async () => {
      mockCheckHitCount.mockClear();
      const totalHits$ = new BehaviorSubject({
        fetchStatus: FetchStatus.LOADING,
        result: undefined,
      }) as DataTotalHits$;
      const main$ = new BehaviorSubject({
        fetchStatus: FetchStatus.COMPLETE,
        recordRawType: RecordRawType.DOCUMENT,
        foundDocuments: true,
      }) as DataMain$;
      const stateContainer = getStateContainer();
      const { hook } = await renderUseDiscoverHistogram({ stateContainer, totalHits$, main$ });
      const containerState = stateContainer.appState.getState();
      const state = {
        timeInterval: containerState.interval,
        chartHidden: containerState.hideChart,
        breakdownField: containerState.breakdownField,
        totalHitsStatus: UnifiedHistogramFetchStatus.loading,
        totalHitsResult: undefined,
      } as unknown as UnifiedHistogramState;
      const api = createUnifiedHistogramApi();
      api.getState$ = jest.fn((selector) => {
        const returnedState = {
          ...state,
          totalHitsStatus: UnifiedHistogramFetchStatus.complete,
          totalHitsResult: 100,
        };
        if (selector) {
          return new BehaviorSubject(selector(returnedState));
        }
        return new BehaviorSubject(returnedState);
      }) as typeof api['getState$'];
      act(() => {
        hook.result.current.setUnifiedHistogramApi(api);
      });
      expect(totalHits$.value).toEqual({
        fetchStatus: FetchStatus.COMPLETE,
        result: 100,
      });
      expect(mockCheckHitCount).toHaveBeenCalledWith(main$, 100);
    });

    it('should not update total hits when the total hits state changes to an error', async () => {
      mockCheckHitCount.mockClear();
      const totalHits$ = new BehaviorSubject({
        fetchStatus: FetchStatus.UNINITIALIZED,
        result: undefined,
      }) as DataTotalHits$;
      const stateContainer = getStateContainer();
      const { hook } = await renderUseDiscoverHistogram({ stateContainer, totalHits$ });
      const containerState = stateContainer.appState.getState();
      const error = new Error('test');
      const state = {
        timeInterval: containerState.interval,
        chartHidden: containerState.hideChart,
        breakdownField: containerState.breakdownField,
        totalHitsStatus: UnifiedHistogramFetchStatus.loading,
        totalHitsResult: undefined,
      } as unknown as UnifiedHistogramState;
      const api = createUnifiedHistogramApi();
      api.getState$ = jest.fn((selector) => {
        const returnedState = {
          ...state,
          totalHitsStatus: UnifiedHistogramFetchStatus.error,
          totalHitsResult: error,
        };
        if (selector) {
          return new BehaviorSubject(selector(returnedState));
        }
        return new BehaviorSubject(returnedState);
      }) as typeof api['getState$'];
      act(() => {
        hook.result.current.setUnifiedHistogramApi(api);
      });
      expect(sendErrorTo).toHaveBeenCalledWith(mockData, totalHits$);
      expect(totalHits$.value).toEqual({
        fetchStatus: FetchStatus.ERROR,
        error,
      });
      expect(mockCheckHitCount).not.toHaveBeenCalled();
    });
  });

  describe('refetching', () => {
    it('should call refetch when savedSearchFetch$ is triggered', async () => {
      const savedSearchFetch$ = new Subject<{
        reset: boolean;
        searchSessionId: string;
      }>();
      const { hook } = await renderUseDiscoverHistogram({ savedSearchFetch$ });
      const api = createUnifiedHistogramApi();
      act(() => {
        hook.result.current.setUnifiedHistogramApi(api);
      });
      expect(api.refetch).not.toHaveBeenCalled();
      act(() => {
        savedSearchFetch$.next({ reset: false, searchSessionId: '1234' });
      });
      expect(api.refetch).toHaveBeenCalled();
    });

    it('should not call refetch when searchSessionId is not set', async () => {
      const savedSearchFetch$ = new Subject<{
        reset: boolean;
        searchSessionId: string;
      }>();
      const { hook } = await renderUseDiscoverHistogram({
        savedSearchFetch$,
        searchSessionId: null,
      });
      const api = createUnifiedHistogramApi();
      act(() => {
        hook.result.current.setUnifiedHistogramApi(api);
      });
      expect(api.refetch).not.toHaveBeenCalled();
      act(() => {
        savedSearchFetch$.next({ reset: false, searchSessionId: '1234' });
      });
      expect(api.refetch).not.toHaveBeenCalled();
    });

    it('should call refetch when searchSessionId is not set and isPlainRecord is true', async () => {
      const savedSearchFetch$ = new Subject<{
        reset: boolean;
        searchSessionId: string;
      }>();
      const { hook } = await renderUseDiscoverHistogram({
        savedSearchFetch$,
        searchSessionId: null,
        isPlainRecord: true,
      });
      const api = createUnifiedHistogramApi();
      act(() => {
        hook.result.current.setUnifiedHistogramApi(api);
      });
      expect(api.refetch).not.toHaveBeenCalled();
      act(() => {
        savedSearchFetch$.next({ reset: false, searchSessionId: '1234' });
      });
      expect(api.refetch).toHaveBeenCalled();
    });

    it('should skip the next refetch when hideChart changes from true to false', async () => {
      const stateContainer = getStateContainer();
      const savedSearchFetch$ = new Subject<{
        reset: boolean;
        searchSessionId: string;
      }>();
      const { hook } = await renderUseDiscoverHistogram({ stateContainer, savedSearchFetch$ });
      const api = createUnifiedHistogramApi();
      act(() => {
        hook.result.current.setUnifiedHistogramApi(api);
      });
      act(() => {
        stateContainer.setAppState({ hideChart: true });
      });
      act(() => {
        stateContainer.setAppState({ hideChart: false });
      });
      act(() => {
        savedSearchFetch$.next({ reset: false, searchSessionId: '1234' });
      });
      expect(api.refetch).not.toHaveBeenCalled();
    });
  });
});
