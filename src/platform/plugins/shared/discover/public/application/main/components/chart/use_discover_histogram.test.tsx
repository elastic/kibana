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
import { act, renderHook } from '@testing-library/react';
import { BehaviorSubject, Subject } from 'rxjs';
import { FetchStatus } from '../../../types';
import type { DiscoverStateContainer } from '../../state_management/discover_state';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { useDiscoverHistogram, type UseUnifiedHistogramOptions } from './use_discover_histogram';
import { setTimeout } from 'timers/promises';
import { getDiscoverStateMock } from '../../../../__mocks__/discover_state.mock';
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
import { internalStateActions } from '../../state_management/redux';
import { dataViewMockWithTimeField } from '@kbn/discover-utils/src/__mocks__';
import { DiscoverTestProvider } from '../../../../__mocks__/test_provider';
import type { ScopedProfilesManager } from '../../../../context_awareness';
import { createContextAwarenessMocks } from '../../../../context_awareness/__mocks__';
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
  const getStateContainer = () => {
    const stateContainer = getDiscoverStateMock({ isTimeBased: true });
    stateContainer.appState.update({
      interval: 'auto',
      hideChart: false,
    });
    const appState = stateContainer.appState;
    const wrappedStateContainer = Object.create(appState);
    wrappedStateContainer.update = jest.fn((newState) => appState.update(newState));
    stateContainer.appState = wrappedStateContainer;
    return stateContainer;
  };

  const renderUseDiscoverHistogram = async ({
    stateContainer = getStateContainer(),
    scopedProfilesManager,
    options,
  }: {
    stateContainer?: DiscoverStateContainer;
    scopedProfilesManager?: ScopedProfilesManager;
    options?: UseUnifiedHistogramOptions;
  } = {}) => {
    const Wrapper = ({ children }: React.PropsWithChildren<unknown>) => (
      <DiscoverTestProvider
        stateContainer={stateContainer}
        scopedProfilesManager={scopedProfilesManager}
        runtimeState={{ currentDataView: dataViewMockWithTimeField, adHocDataViews: [] }}
      >
        {children}
      </DiscoverTestProvider>
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
      const stateContainer = getStateContainer();
      stateContainer.appState.update({ query: { esql: 'from *' } });
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
      const stateContainer = getStateContainer();
      const inspectorAdapters = { requests: new RequestAdapter(), lensRequests: undefined };
      stateContainer.dataState.inspectorAdapters = inspectorAdapters;
      const { hook } = await renderUseDiscoverHistogram({ stateContainer });
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
      expect(stateContainer.appState.update).toHaveBeenCalledWith({
        hideChart: state.chartHidden,
      });
    });

    it('should not sync Unified Histogram state with the state container if there are no changes', async () => {
      const stateContainer = getStateContainer();
      const { hook } = await renderUseDiscoverHistogram({ stateContainer });
      const containerState = stateContainer.appState.get();
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
      expect(stateContainer.appState.update).not.toHaveBeenCalled();
    });

    it('should sync the state container state with Unified Histogram', async () => {
      const stateContainer = getStateContainer();
      const { hook } = await renderUseDiscoverHistogram({ stateContainer });
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
      stateContainer.appState.update({ hideChart: true });
      expect(api.setTotalHits).not.toHaveBeenCalled();
      expect(api.setChartHidden).toHaveBeenCalled();
      expect(Object.keys(params ?? {})).toEqual(['chartHidden']);
    });

    it('should exclude totalHitsStatus and totalHitsResult from Unified Histogram state updates', async () => {
      const stateContainer = getStateContainer();
      const { hook } = await renderUseDiscoverHistogram({ stateContainer });
      const containerState = stateContainer.appState.get();
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
      stateContainer.appState.update({ hideChart: true });
      expect(Object.keys(params ?? {})).toEqual(['chartHidden']);
      params = {};
      stateContainer.appState.update({ hideChart: false });
      act(() => {
        subject$.next({
          ...state,
          totalHitsStatus: UnifiedHistogramFetchStatus.complete,
          totalHitsResult: 100,
        });
      });
      expect(Object.keys(params ?? {})).toEqual(['chartHidden']);
    });

    it('should update total hits when the total hits state changes', async () => {
      const stateContainer = getStateContainer();
      const { hook } = await renderUseDiscoverHistogram({ stateContainer });
      const containerState = stateContainer.appState.get();
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
      const stateContainer = getStateContainer();
      const { hook } = await renderUseDiscoverHistogram({ stateContainer });
      const containerState = stateContainer.appState.get();
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
      const stateContainer = getStateContainer();
      stateContainer.appState.update({ query: { esql: 'from *' } });
      const { hook } = await renderUseDiscoverHistogram({ stateContainer });
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
      const stateContainer = getStateContainer();
      const timeRangeAbs = { from: '2021-05-01T20:00:00Z', to: '2021-05-02T20:00:00Z' };
      const timeRangeRel = { from: 'now-15m', to: 'now' };
      const query = { esql: 'from *' };
      stateContainer.appState.update({ query });
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
      const { hook } = await renderUseDiscoverHistogram({ stateContainer });
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
    it('should call fetch when fetchChart$ is triggered', async () => {
      const fetch$ = new Subject<DiscoverLatestFetchDetails>();
      const stateContainer = getStateContainer();
      stateContainer.dataState.fetchChart$ = fetch$;
      const { hook } = await renderUseDiscoverHistogram({ stateContainer });
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
    });

    it('should call fetch when only visContext changes', async () => {
      const fetch$ = new Subject<DiscoverLatestFetchDetails>();
      const stateContainer = getStateContainer();
      stateContainer.appState.update({ query: { esql: 'from logs*' } });
      stateContainer.dataState.fetchChart$ = fetch$;
      const { hook } = await renderUseDiscoverHistogram({ stateContainer });
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
      const visContext = {
        attributes: {},
        requestData: {},
        suggestionType: UnifiedHistogramSuggestionType.histogramForESQL,
      } as UnifiedHistogramVisContext;
      act(() => {
        stateContainer.savedSearchState.set({
          ...stateContainer.savedSearchState.getState(),
          visContext,
        });
      });
      expect(api.fetch).toHaveBeenCalledTimes(2);
      expect(api.fetch).toHaveBeenLastCalledWith(
        expect.objectContaining({ externalVisContext: visContext })
      );
    });
  });

  describe('customization', () => {
    test('should use custom values provided by customization fwk ', async () => {
      mockUseCustomizations = true;
      const stateContainer = getStateContainer();
      const { hook } = await renderUseDiscoverHistogram({ stateContainer });

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
      const stateContainer = getStateContainer();
      const { profilesManagerMock, scopedEbtManagerMock } = createContextAwarenessMocks();
      const scopedProfilesManager = profilesManagerMock.createScopedProfilesManager({
        scopedEbtManager: scopedEbtManagerMock,
      });
      scopedProfilesManager.resolveDataSourceProfile({});
      const { hook } = await renderUseDiscoverHistogram({ scopedProfilesManager, stateContainer });

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
