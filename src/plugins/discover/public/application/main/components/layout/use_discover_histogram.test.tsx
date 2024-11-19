/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { ReactElement } from 'react';
import { AggregateQuery, Query } from '@kbn/es-query';
import { act, renderHook, WrapperComponent } from '@testing-library/react-hooks';
import { BehaviorSubject, Subject } from 'rxjs';
import { FetchStatus } from '../../../types';
import type { DiscoverStateContainer } from '../../state_management/discover_state';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { useDiscoverHistogram, UseDiscoverHistogramProps } from './use_discover_histogram';
import { setTimeout } from 'timers/promises';
import { getDiscoverStateMock } from '../../../../__mocks__/discover_state.mock';
import { DiscoverMainProvider } from '../../state_management/discover_state_provider';
import { RequestAdapter } from '@kbn/inspector-plugin/public';
import {
  UnifiedHistogramFetchStatus,
  UnifiedHistogramState,
} from '@kbn/unified-histogram-plugin/public';
import { createMockUnifiedHistogramApi } from '@kbn/unified-histogram-plugin/public/mocks';
import { checkHitCount, sendErrorTo } from '../../hooks/use_saved_search_messages';
import type { InspectorAdapters } from '../../hooks/use_inspector';
import { UnifiedHistogramCustomization } from '../../../../customizations/customization_types/histogram_customization';
import { useDiscoverCustomization } from '../../../../customizations';
import { DiscoverCustomizationId } from '../../../../customizations/customization_service';

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
      breakdownField: 'extension',
    });
    const appState = stateContainer.appState;
    const wrappedStateContainer = Object.create(appState);
    wrappedStateContainer.update = jest.fn((newState) => appState.update(newState));
    stateContainer.appState = wrappedStateContainer;
    return stateContainer;
  };

  const renderUseDiscoverHistogram = async ({
    stateContainer = getStateContainer(),
    inspectorAdapters = { requests: new RequestAdapter() },
    hideChart = false,
  }: {
    stateContainer?: DiscoverStateContainer;
    inspectorAdapters?: InspectorAdapters;
    hideChart?: boolean;
  } = {}) => {
    const initialProps = {
      stateContainer,
      inspectorAdapters,
      hideChart,
    };

    const Wrapper: WrapperComponent<React.PropsWithChildren<UseDiscoverHistogramProps>> = ({
      children,
    }) => (
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
    it('should return the expected parameters from getCreationOptions', async () => {
      const { hook } = await renderUseDiscoverHistogram();
      const params = hook.result.current.getCreationOptions();
      expect(params?.localStorageKeyPrefix).toBe('discover');
      expect(params?.disableAutoFetching).toBe(true);
      expect(Object.keys(params?.initialState ?? {})).toEqual([
        'chartHidden',
        'timeInterval',
        'breakdownField',
        'totalHitsStatus',
        'totalHitsResult',
      ]);
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
        hook.result.current.ref(api);
      });
      expect(api.state$.subscribe).toHaveBeenCalledTimes(2);
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
      const api = createMockUnifiedHistogramApi();
      api.state$ = new BehaviorSubject({ ...state, lensRequestAdapter });
      act(() => {
        hook.result.current.ref(api);
      });
      expect(inspectorAdapters.lensRequests).toBe(lensRequestAdapter);
      expect(stateContainer.appState.update).toHaveBeenCalledWith({
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
      const api = createMockUnifiedHistogramApi();
      api.state$ = new BehaviorSubject(state);
      act(() => {
        hook.result.current.ref(api);
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
      api.setBreakdownField = jest.fn((breakdownField) => {
        params = { ...params, breakdownField };
      });
      act(() => {
        hook.result.current.ref(api);
      });
      stateContainer.appState.update({ hideChart: true, interval: '1m', breakdownField: 'test' });
      expect(api.setTotalHits).not.toHaveBeenCalled();
      expect(api.setChartHidden).toHaveBeenCalled();
      expect(api.setTimeInterval).toHaveBeenCalled();
      expect(api.setBreakdownField).toHaveBeenCalled();
      expect(Object.keys(params ?? {})).toEqual(['breakdownField', 'timeInterval', 'chartHidden']);
    });

    it('should exclude totalHitsStatus and totalHitsResult from Unified Histogram state updates', async () => {
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
      const api = createMockUnifiedHistogramApi();
      let params: Partial<UnifiedHistogramState> = {};
      api.setChartHidden = jest.fn((chartHidden) => {
        params = { ...params, chartHidden };
      });
      const subject$ = new BehaviorSubject(state);
      api.state$ = subject$;
      act(() => {
        hook.result.current.ref(api);
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
        breakdownField: containerState.breakdownField,
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
        hook.result.current.ref(api);
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
        breakdownField: containerState.breakdownField,
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
        hook.result.current.ref(api);
      });
      expect(sendErrorTo).toHaveBeenCalledWith(stateContainer.dataState.data$.totalHits$);
      expect(stateContainer.dataState.data$.totalHits$.value).toEqual({
        fetchStatus: FetchStatus.ERROR,
        error,
      });
      expect(mockCheckHitCount).not.toHaveBeenCalled();
    });

    it('should set isChartLoading to true for fetch start', async () => {
      const fetch$ = new Subject<{
        options: {
          reset: boolean;
          fetchMore: boolean;
        };
        searchSessionId: string;
      }>();
      const stateContainer = getStateContainer();
      stateContainer.appState.update({ query: { esql: 'from *' } });
      stateContainer.dataState.fetch$ = fetch$;
      const { hook } = await renderUseDiscoverHistogram({ stateContainer });
      act(() => {
        fetch$.next({
          options: { reset: false, fetchMore: false },
          searchSessionId: '1234',
        });
      });
      expect(hook.result.current.isChartLoading).toBe(true);
    });
  });

  describe('refetching', () => {
    it('should call refetch when savedSearchFetch$ is triggered', async () => {
      const savedSearchFetch$ = new Subject<{
        options: {
          reset: boolean;
          fetchMore: boolean;
        };
        searchSessionId: string;
      }>();
      const stateContainer = getStateContainer();
      stateContainer.dataState.fetch$ = savedSearchFetch$;
      const { hook } = await renderUseDiscoverHistogram({ stateContainer });
      const api = createMockUnifiedHistogramApi();
      act(() => {
        hook.result.current.ref(api);
      });
      expect(api.refetch).toHaveBeenCalled();
      act(() => {
        savedSearchFetch$.next({
          options: { reset: false, fetchMore: false },
          searchSessionId: '1234',
        });
      });
      expect(api.refetch).toHaveBeenCalledTimes(2);
    });

    it('should skip the next refetch when hideChart changes from true to false', async () => {
      const savedSearchFetch$ = new Subject<{
        options: {
          reset: boolean;
          fetchMore: boolean;
        };
        searchSessionId: string;
      }>();
      const stateContainer = getStateContainer();
      stateContainer.dataState.fetch$ = savedSearchFetch$;
      const { hook, initialProps } = await renderUseDiscoverHistogram({ stateContainer });
      const api = createMockUnifiedHistogramApi();
      act(() => {
        hook.result.current.ref(api);
      });
      expect(api.refetch).toHaveBeenCalled();
      act(() => {
        hook.rerender({ ...initialProps, hideChart: true });
      });
      act(() => {
        hook.rerender({ ...initialProps, hideChart: false });
      });
      act(() => {
        savedSearchFetch$.next({
          options: { reset: false, fetchMore: false },
          searchSessionId: '1234',
        });
      });
      expect(api.refetch).toHaveBeenCalledTimes(1);
    });

    it('should skip the next refetch when fetching more', async () => {
      const savedSearchFetch$ = new Subject<{
        options: {
          reset: boolean;
          fetchMore: boolean;
        };
        searchSessionId: string;
      }>();
      const stateContainer = getStateContainer();
      stateContainer.dataState.fetch$ = savedSearchFetch$;
      const { hook } = await renderUseDiscoverHistogram({ stateContainer });
      const api = createMockUnifiedHistogramApi();
      act(() => {
        hook.result.current.ref(api);
      });
      expect(api.refetch).toHaveBeenCalledTimes(1);
      act(() => {
        savedSearchFetch$.next({
          options: { reset: false, fetchMore: true },
          searchSessionId: '1234',
        });
      });
      expect(api.refetch).toHaveBeenCalledTimes(1);

      act(() => {
        savedSearchFetch$.next({
          options: { reset: false, fetchMore: false },
          searchSessionId: '1234',
        });
      });
      expect(api.refetch).toHaveBeenCalledTimes(2);
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
});
