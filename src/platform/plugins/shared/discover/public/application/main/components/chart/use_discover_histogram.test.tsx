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
import { renderHook, act } from '@testing-library/react';
import { BehaviorSubject, Subject } from 'rxjs';
import { FetchStatus } from '../../../types';
import type { DiscoverStateContainer } from '../../state_management/discover_state';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { useDiscoverHistogram, type UseUnifiedHistogramOptions } from './use_discover_histogram';
import { setTimeout } from 'timers/promises';
import { getDiscoverStateMock } from '../../../../__mocks__/discover_state.mock';
import { RequestAdapter } from '@kbn/inspector-plugin/public';
import type { UnifiedHistogramState } from '@kbn/unified-histogram';
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

jest.mock('@kbn/unified-field-list/src/hooks/use_query_subscriber', () => {
  const originalModule = jest.requireActual(
    '@kbn/unified-field-list/src/hooks/use_query_subscriber'
  );
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
          "timeInterval": "auto",
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
          "timeInterval": "auto",
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
        timeInterval: '1m',
        chartHidden: true,
        totalHitsStatus: UnifiedHistogramFetchStatus.loading,
        totalHitsResult: undefined,
      } as unknown as UnifiedHistogramState;
      const api = createMockUnifiedHistogramApi();
      api.state$ = new BehaviorSubject({ ...state, lensRequestAdapter });
      act(() => {
        hook.result.current.setUnifiedHistogramApi(api);
      });
      expect(inspectorAdapters.lensRequests).toBe(lensRequestAdapter);
      expect(stateContainer.appState.update).toHaveBeenCalledWith({
        interval: state.timeInterval,
        hideChart: state.chartHidden,
      });
    });

    it('should not sync Unified Histogram state with the state container if there are no changes', async () => {
      const stateContainer = getStateContainer();
      const { hook } = await renderUseDiscoverHistogram({ stateContainer });
      const containerState = stateContainer.appState.getState();
      const state = {
        timeInterval: containerState.interval,
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
      api.setTimeInterval = jest.fn((timeInterval) => {
        params = { ...params, timeInterval };
      });
      act(() => {
        hook.result.current.setUnifiedHistogramApi(api);
      });
      stateContainer.appState.update({ hideChart: true, interval: '1m' });
      expect(api.setTotalHits).not.toHaveBeenCalled();
      expect(api.setChartHidden).toHaveBeenCalled();
      expect(api.setTimeInterval).toHaveBeenCalled();
      expect(Object.keys(params ?? {})).toEqual(['timeInterval', 'chartHidden']);
    });

    it('should exclude totalHitsStatus and totalHitsResult from Unified Histogram state updates', async () => {
      const stateContainer = getStateContainer();
      const { hook } = await renderUseDiscoverHistogram({ stateContainer });
      const containerState = stateContainer.appState.getState();
      const state = {
        timeInterval: containerState.interval,
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
      const containerState = stateContainer.appState.getState();
      const state = {
        timeInterval: containerState.interval,
        chartHidden: containerState.hideChart,
        totalHitsStatus: UnifiedHistogramFetchStatus.loading,
        totalHitsResult: undefined,
      } as unknown as UnifiedHistogramState;
      const api = createMockUnifiedHistogramApi();
      api.state$ = new BehaviorSubject({
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
      const containerState = stateContainer.appState.getState();
      const error = new Error('test');
      const state = {
        timeInterval: containerState.interval,
        chartHidden: containerState.hideChart,
        totalHitsStatus: UnifiedHistogramFetchStatus.loading,
        totalHitsResult: undefined,
      } as unknown as UnifiedHistogramState;
      const api = createMockUnifiedHistogramApi();
      api.state$ = new BehaviorSubject({
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
      const fetch$ = new Subject<void>();
      const stateContainer = getStateContainer();
      stateContainer.appState.update({ query: { esql: 'from *' } });
      stateContainer.dataState.fetchChart$ = fetch$;
      const { hook } = await renderUseDiscoverHistogram({ stateContainer });
      act(() => {
        fetch$.next();
      });
      expect(hook.result.current.isChartLoading).toBe(true);
    });

    it('should use timerange + timeRangeRelative + query given by the internalState', async () => {
      const fetch$ = new Subject<void>();
      const stateContainer = getStateContainer();
      const timeRangeAbs = { from: '2021-05-01T20:00:00Z', to: '2021-05-02T20:00:00Z' };
      const timeRangeRel = { from: 'now-15m', to: 'now' };
      stateContainer.internalState.dispatch(
        stateContainer.injectCurrentTab(internalStateActions.setDataRequestParams)({
          dataRequestParams: {
            timeRangeAbsolute: timeRangeAbs,
            timeRangeRelative: timeRangeRel,
            searchSessionId: '123',
          },
        })
      );
      const { hook } = await renderUseDiscoverHistogram({ stateContainer });
      act(() => {
        fetch$.next();
      });
      expect(hook.result.current.timeRange).toBe(timeRangeAbs);
      expect(hook.result.current.relativeTimeRange).toBe(timeRangeRel);
    });
  });

  describe('fetching', () => {
    it('should call fetch when savedSearchFetch$ is triggered', async () => {
      const savedSearchFetch$ = new Subject<void>();
      const stateContainer = getStateContainer();
      stateContainer.dataState.fetchChart$ = savedSearchFetch$;
      const { hook } = await renderUseDiscoverHistogram({ stateContainer });
      const api = createMockUnifiedHistogramApi();
      act(() => {
        hook.result.current.setUnifiedHistogramApi(api);
      });
      expect(api.fetch).not.toHaveBeenCalled();
      act(() => {
        savedSearchFetch$.next();
      });
      expect(api.fetch).toHaveBeenCalledTimes(1);
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
      const { profilesManagerMock, scopedEbtManagerMock } = createContextAwarenessMocks();
      const scopedProfilesManager = profilesManagerMock.createScopedProfilesManager({
        scopedEbtManager: scopedEbtManagerMock,
      });
      scopedProfilesManager.resolveDataSourceProfile({});
      const { hook } = await renderUseDiscoverHistogram({ scopedProfilesManager });
      const modifiedAttributes = hook.result.current.getModifiedVisAttributes?.(
        {} as TypedLensByValueInput['attributes']
      );
      expect(modifiedAttributes).toEqual({ title: 'Modified title' });
    });
  });
});
