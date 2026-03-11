/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { AggregateQuery, Query } from '@kbn/es-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { BehaviorSubject, Subject } from 'rxjs';
import { FetchStatus } from '../../../types';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { useDiscoverHistogram, type UseUnifiedHistogramOptions } from './use_discover_histogram';
import { setTimeout } from 'timers/promises';
import type { InternalStateMockToolkit } from '../../../../__mocks__/discover_state.mock';
import { getDiscoverInternalStateMock } from '../../../../__mocks__/discover_state.mock';
import { RequestAdapter } from '@kbn/inspector-plugin/public';
import type {
  UnifiedHistogramFetchParamsExternal,
  UnifiedHistogramState,
  UnifiedHistogramVisContext,
} from '@kbn/unified-histogram';
import { UnifiedHistogramSuggestionType } from '@kbn/unified-histogram/types';
import { UnifiedHistogramFetchStatus } from '@kbn/unified-histogram';
import { createMockUnifiedHistogramApi } from '@kbn/unified-histogram/mocks';
import { checkHitCount, sendErrorTo } from '../../hooks/use_saved_search_messages';
import type { UnifiedHistogramCustomization } from '../../../../customizations/customization_types/histogram_customization';
import { useDiscoverCustomization } from '../../../../customizations';
import type { DiscoverCustomizationId } from '../../../../customizations/customization_service';
import { internalStateActions, selectTabRuntimeState } from '../../state_management/redux';
import { DiscoverToolkitTestProvider } from '../../../../__mocks__/test_provider';
import type { TypedLensByValueInput } from '@kbn/lens-plugin/public';
import type { DiscoverLatestFetchDetails } from '../../state_management/discover_data_state_container';

const mockData = dataPluginMock.createStartContract();
let mockQueryState = {
  query: {
    query: 'query',
    language: 'kuery',
  } as Query | AggregateQuery,
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

jest.mock('../../hooks/use_saved_search_messages', () => {
  const originalModule = jest.requireActual('../../hooks/use_saved_search_messages');
  return {
    ...originalModule,
    checkHitCount: jest.fn(originalModule.checkHitCount),
    sendErrorTo: jest.fn(originalModule.sendErrorTo),
  };
});
jest.mock('../../../../customizations', () => ({
  ...jest.requireActual('../../../../customizations'),
  useDiscoverCustomization: jest.fn(),
}));

let mockUseCustomizations = false;

const mockHistogramCustomization: UnifiedHistogramCustomization = {
  id: 'unified_histogram',
  onFilter: jest.fn(),
  onBrushEnd: jest.fn(),
  withDefaultActions: true,
};

const mockCheckHitCount = checkHitCount as jest.MockedFunction<typeof checkHitCount>;

describe('useDiscoverHistogram', () => {
  const setup = async () => {
    const toolkit = getDiscoverInternalStateMock();

    await toolkit.initializeTabs();

    const { stateContainer } = await toolkit.initializeSingleTab({
      tabId: toolkit.getCurrentTab().id,
    });

    toolkit.internalState.dispatch(
      internalStateActions.updateAppState({
        tabId: toolkit.getCurrentTab().id,
        appState: {
          interval: 'auto',
          hideChart: false,
        },
      })
    );

    return { toolkit, stateContainer };
  };

  const renderUseDiscoverHistogram = async ({
    toolkit,
    options,
  }: {
    toolkit?: InternalStateMockToolkit;
    options?: UseUnifiedHistogramOptions;
  } = {}) => {
    if (!toolkit) {
      ({ toolkit } = await setup());
    }

    const stateContainer = selectTabRuntimeState(
      toolkit.runtimeStateManager,
      toolkit.getCurrentTab().id
    ).stateContainer$.getValue()!;

    const Wrapper = ({ children }: React.PropsWithChildren<unknown>) => (
      <DiscoverToolkitTestProvider toolkit={toolkit}>{children}</DiscoverToolkitTestProvider>
    );

    const hook = renderHook(() => useDiscoverHistogram(stateContainer, options), {
      wrapper: Wrapper,
    });

    await act(() => setTimeout(0));

    return { hook };
  };

  beforeEach(() => {
    mockUseCustomizations = false;
    jest.clearAllMocks();

    (useDiscoverCustomization as jest.Mock).mockImplementation((id: DiscoverCustomizationId) => {
      if (!mockUseCustomizations) {
        return undefined;
      }
      switch (id) {
        case 'unified_histogram':
          return mockHistogramCustomization;
        default:
          throw new Error(`Unknown customization id: ${id}`);
      }
    });
  });

  describe('initialization', () => {
    it('should return the expected parameters', async () => {
      const { hook } = await renderUseDiscoverHistogram();
      const params = hook.result.current;
      expect(params?.localStorageKeyPrefix).toBe('discover');
      expect(params?.initialState).toMatchInlineSnapshot(`
        Object {
          "chartHidden": false,
          "topPanelHeight": undefined,
          "totalHitsResult": undefined,
          "totalHitsStatus": "loading",
        }
      `);
    });

    it('should return the restored initial state', async () => {
      const { hook } = await renderUseDiscoverHistogram({
        options: {
          initialLayoutProps: {
            topPanelHeight: 100,
          },
        },
      });
      const params = hook.result.current;
      expect(params?.localStorageKeyPrefix).toBe('discover');
      expect(params?.initialState).toMatchInlineSnapshot(`
        Object {
          "chartHidden": false,
          "topPanelHeight": 100,
          "totalHitsResult": undefined,
          "totalHitsStatus": "loading",
        }
      `);
    });

    it('should return the isChartLoading params for ES|QL mode', async () => {
      const { hook } = await renderUseDiscoverHistogram();
      const isChartLoading = hook.result.current.isChartLoading;
      expect(isChartLoading).toBe(false);
    });
  });

  describe('state', () => {
    beforeEach(() => {
      mockCheckHitCount.mockClear();
    });

    it('should subscribe to state changes', async () => {
      const { hook } = await renderUseDiscoverHistogram();
      const api = createMockUnifiedHistogramApi();
      jest.spyOn(api.state$, 'subscribe');
      act(() => {
        hook.result.current.setUnifiedHistogramApi(api);
      });
      expect(api.state$.subscribe).toHaveBeenCalledTimes(2);
    });

    it('should sync Unified Histogram state with the state container', async () => {
      const { toolkit, stateContainer } = await setup();
      const updateAppStateSpy = jest.spyOn(internalStateActions, 'updateAppState').mockClear();
      const inspectorAdapters = { requests: new RequestAdapter(), lensRequests: undefined };
      stateContainer.dataState.inspectorAdapters = inspectorAdapters;
      const { hook } = await renderUseDiscoverHistogram({ toolkit });
      const lensRequestAdapter = new RequestAdapter();
      const state = {
        chartHidden: true,
        totalHitsStatus: UnifiedHistogramFetchStatus.loading,
        totalHitsResult: undefined,
      } as unknown as UnifiedHistogramState;
      const api = createMockUnifiedHistogramApi();
      api.state$ = new BehaviorSubject<UnifiedHistogramState>({
        ...state,
        lensRequestAdapter,
      });
      act(() => {
        hook.result.current.setUnifiedHistogramApi(api);
      });
      expect(inspectorAdapters.lensRequests).toBe(lensRequestAdapter);
      expect(updateAppStateSpy).toHaveBeenCalledWith({
        tabId: stateContainer.getCurrentTab().id,
        appState: { hideChart: state.chartHidden },
      });
    });

    it('should not sync Unified Histogram state with the state container if there are no changes', async () => {
      const { toolkit, stateContainer } = await setup();
      const updateAppStateSpy = jest.spyOn(internalStateActions, 'updateAppState').mockClear();
      const setAppStateSpy = jest.spyOn(internalStateActions, 'setAppState').mockClear();
      const { hook } = await renderUseDiscoverHistogram({ toolkit });
      const containerState = stateContainer.getCurrentTab().appState;
      const state = {
        chartHidden: containerState.hideChart,
        totalHitsStatus: UnifiedHistogramFetchStatus.loading,
        totalHitsResult: undefined,
      } as unknown as UnifiedHistogramState;
      const api = createMockUnifiedHistogramApi();
      api.state$ = new BehaviorSubject(state);
      act(() => {
        hook.result.current.setUnifiedHistogramApi(api);
      });
      expect(updateAppStateSpy).toHaveBeenCalled();
      expect(setAppStateSpy).not.toHaveBeenCalled();
    });

    it('should sync the state container state with Unified Histogram', async () => {
      const { toolkit, stateContainer } = await setup();
      const { hook } = await renderUseDiscoverHistogram({ toolkit });
      const api = createMockUnifiedHistogramApi();
      let params: Partial<UnifiedHistogramState> = {};
      api.setTotalHits = jest.fn((p) => {
        params = { ...params, ...p };
      });
      api.setChartHidden = jest.fn((chartHidden) => {
        params = { ...params, chartHidden };
      });
      act(() => {
        hook.result.current.setUnifiedHistogramApi(api);
      });
      stateContainer.internalState.dispatch(
        stateContainer.injectCurrentTab(internalStateActions.updateAppState)({
          appState: { hideChart: true },
        })
      );
      expect(api.setTotalHits).not.toHaveBeenCalled();
      expect(api.setChartHidden).toHaveBeenCalled();
      expect(Object.keys(params ?? {})).toEqual(['chartHidden']);
    });

    it('should exclude totalHitsStatus and totalHitsResult from Unified Histogram state updates', async () => {
      const { toolkit, stateContainer } = await setup();
      const { hook } = await renderUseDiscoverHistogram({ toolkit });
      const containerState = stateContainer.getCurrentTab().appState;
      const state = {
        chartHidden: containerState.hideChart,
        totalHitsStatus: UnifiedHistogramFetchStatus.loading,
        totalHitsResult: undefined,
      } as unknown as UnifiedHistogramState;
      const api = createMockUnifiedHistogramApi();
      let params: Partial<UnifiedHistogramState> = {};
      api.setChartHidden = jest.fn((chartHidden) => {
        params = { ...params, chartHidden };
      });
      const subject$ = new BehaviorSubject(state);
      api.state$ = subject$;
      act(() => {
        hook.result.current.setUnifiedHistogramApi(api);
      });
      stateContainer.internalState.dispatch(
        stateContainer.injectCurrentTab(internalStateActions.updateAppState)({
          appState: { hideChart: true },
        })
      );
      await waitFor(() => {
        expect(params).toEqual({ chartHidden: true });
      });
      params = {};
      stateContainer.internalState.dispatch(
        stateContainer.injectCurrentTab(internalStateActions.updateAppState)({
          appState: { hideChart: false },
        })
      );
      await waitFor(() => {
        expect(params).toEqual({ chartHidden: false });
      });
      act(() => {
        subject$.next({
          ...state,
          totalHitsStatus: UnifiedHistogramFetchStatus.complete,
          totalHitsResult: 100,
        });
      });
      await waitFor(() => {
        expect(params).toEqual({ chartHidden: false });
      });
    });

    it('should update total hits when the total hits state changes', async () => {
      const { toolkit, stateContainer } = await setup();
      mockCheckHitCount.mockClear();
      const { hook } = await renderUseDiscoverHistogram({ toolkit });
      const containerState = stateContainer.getCurrentTab().appState;
      const state = {
        chartHidden: containerState.hideChart,
        totalHitsStatus: UnifiedHistogramFetchStatus.loading,
        totalHitsResult: undefined,
      } as unknown as UnifiedHistogramState;
      const api = createMockUnifiedHistogramApi();
      api.state$ = new BehaviorSubject<UnifiedHistogramState>({
        ...state,
        totalHitsStatus: UnifiedHistogramFetchStatus.complete,
        totalHitsResult: 100,
      });
      expect(stateContainer.dataState.data$.totalHits$.value).not.toEqual({
        fetchStatus: FetchStatus.COMPLETE,
        result: 100,
      });
      act(() => {
        hook.result.current.setUnifiedHistogramApi(api);
      });
      expect(stateContainer.dataState.data$.totalHits$.value).toEqual({
        fetchStatus: FetchStatus.COMPLETE,
        result: 100,
      });
      expect(mockCheckHitCount).toHaveBeenCalledWith(stateContainer.dataState.data$.main$, 100);
    });

    it('should not update total hits when the total hits state changes to an error', async () => {
      mockQueryState = {
        query: {
          query: 'query',
          language: 'kuery',
        } as Query | AggregateQuery,
        filters: [],
        time: {
          from: 'now-15m',
          to: 'now',
        },
      };

      mockData.query.getState = () => mockQueryState;
      const { toolkit, stateContainer } = await setup();
      mockCheckHitCount.mockClear();
      const { hook } = await renderUseDiscoverHistogram({ toolkit });
      const containerState = stateContainer.getCurrentTab().appState;
      const error = new Error('test');
      const state = {
        chartHidden: containerState.hideChart,
        totalHitsStatus: UnifiedHistogramFetchStatus.loading,
        totalHitsResult: undefined,
      } as unknown as UnifiedHistogramState;
      const api = createMockUnifiedHistogramApi();
      api.state$ = new BehaviorSubject<UnifiedHistogramState>({
        ...state,
        totalHitsStatus: UnifiedHistogramFetchStatus.error,
        totalHitsResult: error,
      });
      expect(stateContainer.dataState.data$.totalHits$.value).not.toEqual({
        fetchStatus: FetchStatus.ERROR,
        error,
      });
      act(() => {
        hook.result.current.setUnifiedHistogramApi(api);
      });
      expect(sendErrorTo).toHaveBeenCalledWith(stateContainer.dataState.data$.totalHits$);
      expect(stateContainer.dataState.data$.totalHits$.value).toEqual({
        fetchStatus: FetchStatus.ERROR,
        error,
      });
      expect(mockCheckHitCount).not.toHaveBeenCalled();
    });

    it('should set isChartLoading to true for fetch start', async () => {
      const { toolkit, stateContainer } = await setup();
      stateContainer.internalState.dispatch(
        stateContainer.injectCurrentTab(internalStateActions.updateAppState)({
          appState: { query: { esql: 'from *' } },
        })
      );
      const { hook } = await renderUseDiscoverHistogram({ toolkit });
      act(() => {
        stateContainer.dataState.data$.documents$.next({ fetchStatus: FetchStatus.LOADING });
      });
      expect(hook.result.current.isChartLoading).toBe(true);
      act(() => {
        stateContainer.dataState.data$.documents$.next({ fetchStatus: FetchStatus.COMPLETE });
      });
      expect(hook.result.current.isChartLoading).toBe(false);
    });

    it('should use timerange + timeRangeRelative + query given by the internalState', async () => {
      const fetch$ = new Subject<DiscoverLatestFetchDetails>();
      const { toolkit, stateContainer } = await setup();
      const timeRangeAbs = { from: '2021-05-01T20:00:00Z', to: '2021-05-02T20:00:00Z' };
      const timeRangeRel = { from: 'now-15m', to: 'now' };
      const query = { esql: 'from *' };
      stateContainer.internalState.dispatch(
        stateContainer.injectCurrentTab(internalStateActions.updateAppState)({
          appState: { query },
        })
      );
      stateContainer.dataState.fetchChart$ = fetch$;
      stateContainer.internalState.dispatch(
        stateContainer.injectCurrentTab(internalStateActions.setDataRequestParams)({
          dataRequestParams: {
            timeRangeAbsolute: timeRangeAbs,
            timeRangeRelative: timeRangeRel,
            searchSessionId: '123',
            isSearchSessionRestored: false,
          },
        })
      );
      const { hook } = await renderUseDiscoverHistogram({ toolkit });
      const api = createMockUnifiedHistogramApi();
      jest.spyOn(api.state$, 'subscribe');
      act(() => {
        hook.result.current.setUnifiedHistogramApi(api);
      });
      act(() => {
        fetch$.next({});
      });
      expect(api.fetch).toHaveBeenCalledTimes(1);
      expect(api.fetch).toHaveBeenCalledWith(
        expect.objectContaining({
          timeRange: timeRangeAbs,
          relativeTimeRange: timeRangeRel,
          query,
          filters: [],
          searchSessionId: '123',
        })
      );
    });
  });

  describe('fetching', () => {
    const setupFetching = async ({ toolkit }: { toolkit: InternalStateMockToolkit }) => {
      const fetch$ = new Subject<DiscoverLatestFetchDetails>();
      const stateContainer = selectTabRuntimeState(
        toolkit.runtimeStateManager,
        toolkit.getCurrentTab().id
      ).stateContainer$.getValue()!;
      stateContainer.dataState.fetchChart$ = fetch$;
      const { hook } = await renderUseDiscoverHistogram({ toolkit });
      const api = createMockUnifiedHistogramApi();
      act(() => {
        hook.result.current.setUnifiedHistogramApi(api);
      });
      expect(api.fetch).not.toHaveBeenCalled();
      const abortController = new AbortController();
      act(() => {
        fetch$.next({ abortController });
      });
      expect(api.fetch).toHaveBeenCalledTimes(1);
      expect(api.fetch).toHaveBeenCalledWith(
        expect.objectContaining({
          abortController,
        })
      );
      return { api, stateContainer };
    };

    it('should call fetch when fetchChart$ is triggered', async () => {
      const { toolkit } = await setup();
      await setupFetching({ toolkit });
    });

    it('should call fetch when only visContext changes', async () => {
      const { toolkit, stateContainer } = await setup();
      stateContainer.internalState.dispatch(
        stateContainer.injectCurrentTab(internalStateActions.updateAppState)({
          appState: { query: { esql: 'from logs*' } },
        })
      );
      const { api } = await setupFetching({ toolkit });
      const visContext = {
        attributes: {},
        requestData: {},
        suggestionType: UnifiedHistogramSuggestionType.histogramForESQL,
      } as UnifiedHistogramVisContext;
      act(() => {
        stateContainer.internalState.dispatch(
          stateContainer.injectCurrentTab(internalStateActions.updateAttributes)({
            attributes: { visContext },
          })
        );
      });
      expect(api.fetch).toHaveBeenCalledTimes(2);
      expect(api.fetch).toHaveBeenLastCalledWith(
        expect.objectContaining({ externalVisContext: visContext })
      );
    });

    it('should call fetch when only breakdownField changes', async () => {
      const { toolkit, stateContainer } = await setup();
      stateContainer.internalState.dispatch(
        stateContainer.injectCurrentTab(internalStateActions.updateAppState)({
          appState: { query: { esql: 'from logs*' } },
        })
      );
      const { api } = await setupFetching({ toolkit });
      const breakdownField = 'host.name';
      act(() => {
        stateContainer.internalState.dispatch(
          stateContainer.injectCurrentTab(internalStateActions.updateAppState)({
            appState: { breakdownField },
          })
        );
      });
      expect(api.fetch).toHaveBeenCalledTimes(2);
      expect(api.fetch).toHaveBeenLastCalledWith(expect.objectContaining({ breakdownField }));
    });

    it('should call fetch when only timeInterval changes', async () => {
      const { toolkit, stateContainer } = await setup();
      stateContainer.internalState.dispatch(
        stateContainer.injectCurrentTab(internalStateActions.updateAppState)({
          appState: { query: { language: 'kuery', query: 'test' } },
        })
      );
      const { api } = await setupFetching({ toolkit });
      const timeInterval = 'm';
      act(() => {
        stateContainer.internalState.dispatch(
          stateContainer.injectCurrentTab(internalStateActions.updateAppState)({
            appState: { interval: timeInterval },
          })
        );
      });
      expect(api.fetch).toHaveBeenCalledTimes(2);
      expect(api.fetch).toHaveBeenLastCalledWith(expect.objectContaining({ timeInterval }));
    });
  });

  describe('customization', () => {
    test('should use custom values provided by customization fwk ', async () => {
      mockUseCustomizations = true;
      const { toolkit } = await setup();
      const { hook } = await renderUseDiscoverHistogram({ toolkit });

      expect(hook.result.current.onFilter).toEqual(mockHistogramCustomization.onFilter);
      expect(hook.result.current.onBrushEnd).toEqual(mockHistogramCustomization.onBrushEnd);
      expect(hook.result.current.withDefaultActions).toEqual(
        mockHistogramCustomization.withDefaultActions
      );
      expect(hook.result.current.disabledActions).toBeUndefined();
    });
  });

  describe('context awareness', () => {
    it('should modify vis attributes based on profile', async () => {
      const { toolkit, stateContainer } = await setup();
      const scopedProfilesManager = selectTabRuntimeState(
        toolkit.runtimeStateManager,
        toolkit.getCurrentTab().id
      ).scopedProfilesManager$.getValue();
      await scopedProfilesManager.resolveDataSourceProfile({});
      const { hook } = await renderUseDiscoverHistogram({ toolkit });

      let getModifiedVisAttributes:
        | UnifiedHistogramFetchParamsExternal['getModifiedVisAttributes']
        | undefined;
      const fetch$ = new Subject<DiscoverLatestFetchDetails>();
      stateContainer.dataState.fetchChart$ = fetch$;
      const api = createMockUnifiedHistogramApi();
      api.fetch = jest.fn((params) => {
        getModifiedVisAttributes = params.getModifiedVisAttributes;
      });
      act(() => {
        hook.result.current.setUnifiedHistogramApi(api);
      });
      act(() => {
        fetch$.next({});
      });
      const modifiedAttributes = getModifiedVisAttributes?.(
        {} as TypedLensByValueInput['attributes']
      );
      expect(modifiedAttributes).toEqual({ title: 'Modified title' });
    });
  });
});
