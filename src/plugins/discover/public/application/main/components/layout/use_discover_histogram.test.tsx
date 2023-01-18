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
import { BehaviorSubject, Subject } from 'rxjs';
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
import { savedSearchMock } from '../../../../__mocks__/saved_search';
import type { Storage } from '@kbn/kibana-utils-plugin/public';
import { LocalStorageMock } from '../../../../__mocks__/local_storage_mock';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { dataViewWithTimefieldMock } from '../../../../__mocks__/data_view_with_timefield';
import {
  CHART_HIDDEN_KEY,
  HISTOGRAM_HEIGHT_KEY,
  useDiscoverHistogram,
  UseDiscoverHistogramProps,
} from './use_discover_histogram';
import { setTimeout } from 'timers/promises';
import { calculateBounds } from '@kbn/data-plugin/public';
import { getDiscoverStateMock } from '../../../../__mocks__/discover_state.mock';
import { DiscoverMainProvider } from '../../services/discover_state_provider';
import { createSearchSessionMock } from '../../../../__mocks__/search_session';
import { RequestAdapter } from '@kbn/inspector-plugin/public';
import { getSessionServiceMock } from '@kbn/data-plugin/public/search/session/mocks';
import { UnifiedHistogramFetchStatus } from '@kbn/unified-histogram-plugin/public';
import { checkHitCount, sendErrorTo } from '../../hooks/use_saved_search_messages';
import type { InspectorAdapters } from '../../hooks/use_inspector';
import type { TypedLensByValueInput } from '@kbn/lens-plugin/public';
import { DiscoverSearchSessionManager } from '../../services/discover_search_session';

const mockData = dataPluginMock.createStartContract();

mockData.query.timefilter.timefilter.getTime = () => {
  return { from: '1991-03-29T08:04:00.694Z', to: '2021-03-29T07:04:00.695Z' };
};
mockData.query.timefilter.timefilter.calculateBounds = (timeRange) => {
  return calculateBounds(timeRange);
};

const mockLens = {
  navigateToPrefilledEditor: jest.fn(),
};

let mockStorage = new LocalStorageMock({}) as unknown as Storage;
let mockCanVisualize = true;

jest.mock('../../../../hooks/use_discover_services', () => {
  const originalModule = jest.requireActual('../../../../hooks/use_discover_services');
  return {
    ...originalModule,
    useDiscoverServices: () => ({ storage: mockStorage, data: mockData, lens: mockLens }),
  };
});

jest.mock('@kbn/unified-field-list-plugin/public', () => {
  const originalModule = jest.requireActual('@kbn/unified-field-list-plugin/public');
  return {
    ...originalModule,
    getVisualizeInformation: jest.fn(() => Promise.resolve(mockCanVisualize)),
    useQuerySubscriber: jest.fn(() => ({
      query: {
        query: 'query',
        language: 'kuery',
      },
      filters: [],
      fromDate: 'now-15m',
      toDate: 'now',
    })),
  };
});

function getStateContainer() {
  const stateContainer = getDiscoverStateMock({ isTimeBased: true });

  stateContainer.setAppState({
    interval: 'auto',
    hideChart: false,
    breakdownField: 'extension',
  });

  const wrappedStateContainer = Object.create(stateContainer);
  wrappedStateContainer.setAppState = jest.fn((newState) => stateContainer.setAppState(newState));

  return wrappedStateContainer;
}

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
  const renderUseDiscoverHistogram = async ({
    isPlainRecord = false,
    isTimeBased = true,
    canVisualize = true,
    storage = new LocalStorageMock({}) as unknown as Storage,
    stateContainer = getStateContainer(),
    searchSessionManager,
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
    isTimeBased?: boolean;
    canVisualize?: boolean;
    storage?: Storage;
    stateContainer?: DiscoverStateContainer;
    searchSessionManager?: DiscoverSearchSessionManager;
    searchSessionId?: string | null;
    inspectorAdapters?: InspectorAdapters;
    totalHits$?: DataTotalHits$;
    main$?: DataMain$;
    savedSearchFetch$?: DataFetch$;
  } = {}) => {
    mockStorage = storage;
    mockCanVisualize = canVisualize;

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

    if (!searchSessionManager) {
      const session = getSessionServiceMock();
      session.getSession$.mockReturnValue(new BehaviorSubject(searchSessionId ?? undefined));
      searchSessionManager = createSearchSessionMock(session).searchSessionManager;
    }

    const initialProps = {
      stateContainer,
      savedSearchData$,
      savedSearchFetch$,
      dataView: dataViewWithTimefieldMock,
      savedSearch: savedSearchMock,
      isTimeBased,
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

  describe('result', () => {
    it('should return undefined if there is no search session', async () => {
      const {
        hook: { result },
      } = await renderUseDiscoverHistogram({ searchSessionId: null });
      expect(result.current).toBeUndefined();
    });

    it('it should not return undefined if there is no search session, but isPlainRecord is true', async () => {
      const {
        hook: { result },
      } = await renderUseDiscoverHistogram({ searchSessionId: null, isPlainRecord: true });
      expect(result.current).toBeDefined();
    });
  });

  describe('contexts', () => {
    it('should output the correct hits context', async () => {
      const {
        hook: { result },
      } = await renderUseDiscoverHistogram();
      expect(result.current?.hits?.status).toBe(UnifiedHistogramFetchStatus.complete);
      expect(result.current?.hits?.total).toEqual(esHits.length);
    });

    it('should output the correct chart context', async () => {
      const {
        hook: { result },
      } = await renderUseDiscoverHistogram();
      expect(result.current?.chart?.hidden).toBe(false);
      expect(result.current?.chart?.timeInterval).toBe('auto');
    });

    it('should output the correct breakdown context', async () => {
      const {
        hook: { result },
      } = await renderUseDiscoverHistogram();
      expect(result.current?.breakdown?.field?.name).toBe('extension');
    });

    it('should output the correct request context', async () => {
      const requestAdapter = new RequestAdapter();
      const {
        hook: { result },
      } = await renderUseDiscoverHistogram({
        searchSessionId: '321',
        inspectorAdapters: { requests: requestAdapter },
      });
      expect(result.current?.request.adapter).toBe(requestAdapter);
      expect(result.current?.request.searchSessionId).toBe('321');
    });

    it('should output undefined for hits and chart and breakdown if isPlainRecord is true', async () => {
      const {
        hook: { result },
      } = await renderUseDiscoverHistogram({ isPlainRecord: true });
      expect(result.current?.hits).toBeUndefined();
      expect(result.current?.chart).toBeUndefined();
      expect(result.current?.breakdown).toBeUndefined();
    });

    it('should output undefined for chart and breakdown if isTimeBased is false', async () => {
      const {
        hook: { result },
      } = await renderUseDiscoverHistogram({ isTimeBased: false });
      expect(result.current?.hits).not.toBeUndefined();
      expect(result.current?.chart).toBeUndefined();
      expect(result.current?.breakdown).toBeUndefined();
    });

    it('should clear lensRequests when chart is undefined', async () => {
      const inspectorAdapters = {
        requests: new RequestAdapter(),
        lensRequests: new RequestAdapter(),
      };
      const { hook, initialProps } = await renderUseDiscoverHistogram({
        inspectorAdapters,
      });
      expect(inspectorAdapters.lensRequests).toBeDefined();
      hook.rerender({ ...initialProps, isPlainRecord: true });
      expect(inspectorAdapters.lensRequests).toBeUndefined();
    });
  });

  describe('search params', () => {
    it('should return the correct query, filters, and timeRange', async () => {
      const { hook } = await renderUseDiscoverHistogram();
      expect(hook.result.current?.query).toEqual({
        query: 'query',
        language: 'kuery',
      });
      expect(hook.result.current?.filters).toEqual([]);
      expect(hook.result.current?.timeRange).toEqual({
        from: 'now-15m',
        to: 'now',
      });
    });
  });

  describe('onEditVisualization', () => {
    it('returns a callback for onEditVisualization when the data view can be visualized', async () => {
      const {
        hook: { result },
      } = await renderUseDiscoverHistogram();
      expect(result.current?.onEditVisualization).toBeDefined();
    });

    it('returns undefined for onEditVisualization when the data view cannot be visualized', async () => {
      const {
        hook: { result },
      } = await renderUseDiscoverHistogram({ canVisualize: false });
      expect(result.current?.onEditVisualization).toBeUndefined();
    });

    it('should call lens.navigateToPrefilledEditor when onEditVisualization is called', async () => {
      const {
        hook: { result },
      } = await renderUseDiscoverHistogram();
      const attributes = { title: 'test' } as TypedLensByValueInput['attributes'];
      result.current?.onEditVisualization!(attributes);
      expect(mockLens.navigateToPrefilledEditor).toHaveBeenCalledWith({
        id: '',
        timeRange: mockData.query.timefilter.timefilter.getTime(),
        attributes,
      });
    });
  });

  describe('topPanelHeight', () => {
    it('should try to get the topPanelHeight from storage', async () => {
      const storage = new LocalStorageMock({}) as unknown as Storage;
      storage.get = jest.fn(() => 100);
      const {
        hook: { result },
      } = await renderUseDiscoverHistogram({ storage });
      expect(storage.get).toHaveBeenCalledWith(HISTOGRAM_HEIGHT_KEY);
      expect(result.current?.topPanelHeight).toBe(100);
    });

    it('should update topPanelHeight when onTopPanelHeightChange is called', async () => {
      const storage = new LocalStorageMock({}) as unknown as Storage;
      storage.get = jest.fn(() => 100);
      storage.set = jest.fn();
      const {
        hook: { result },
      } = await renderUseDiscoverHistogram({ storage });
      expect(result.current?.topPanelHeight).toBe(100);
      act(() => {
        result.current?.onTopPanelHeightChange(200);
      });
      expect(storage.set).toHaveBeenCalledWith(HISTOGRAM_HEIGHT_KEY, 200);
      expect(result.current?.topPanelHeight).toBe(200);
    });
  });

  describe('callbacks', () => {
    it('should update chartHidden when onChartHiddenChange is called', async () => {
      const storage = new LocalStorageMock({}) as unknown as Storage;
      storage.set = jest.fn();
      const stateContainer = getStateContainer();
      const session = getSessionServiceMock();
      const session$ = new BehaviorSubject('123');
      session.getSession$.mockReturnValue(session$);
      const inspectorAdapters = {
        requests: new RequestAdapter(),
        lensRequests: new RequestAdapter(),
      };
      const { hook } = await renderUseDiscoverHistogram({
        storage,
        stateContainer,
        searchSessionManager: createSearchSessionMock(session).searchSessionManager,
        inspectorAdapters,
      });
      act(() => {
        hook.result.current?.onChartHiddenChange(false);
      });
      expect(inspectorAdapters.lensRequests).toBeDefined();
      expect(storage.set).toHaveBeenCalledWith(CHART_HIDDEN_KEY, false);
      expect(stateContainer.setAppState).toHaveBeenCalledWith({ hideChart: false });
      act(() => {
        hook.result.current?.onChartHiddenChange(true);
        session$.next('321');
      });
      hook.rerender();
      expect(inspectorAdapters.lensRequests).toBeUndefined();
      expect(storage.set).toHaveBeenCalledWith(CHART_HIDDEN_KEY, true);
      expect(stateContainer.setAppState).toHaveBeenCalledWith({ hideChart: true });
    });

    it('should set lensRequests when onChartLoad is called', async () => {
      const lensRequests = new RequestAdapter();
      const inspectorAdapters = {
        requests: new RequestAdapter(),
        lensRequests: undefined as RequestAdapter | undefined,
      };
      const {
        hook: { result },
      } = await renderUseDiscoverHistogram({ inspectorAdapters });
      expect(inspectorAdapters.lensRequests).toBeUndefined();
      act(() => {
        result.current?.onChartLoad({ adapters: { requests: lensRequests } });
      });
      expect(inspectorAdapters.lensRequests).toBeDefined();
    });

    it('should update chart hidden when onChartHiddenChange is called', async () => {
      const storage = new LocalStorageMock({}) as unknown as Storage;
      storage.set = jest.fn();
      const stateContainer = getStateContainer();
      const inspectorAdapters = {
        requests: new RequestAdapter(),
        lensRequests: new RequestAdapter(),
      };
      const {
        hook: { result },
      } = await renderUseDiscoverHistogram({
        storage,
        stateContainer,
        inspectorAdapters,
      });
      act(() => {
        result.current?.onChartHiddenChange(true);
      });
      expect(storage.set).toHaveBeenCalledWith(CHART_HIDDEN_KEY, true);
      expect(stateContainer.setAppState).toHaveBeenCalledWith({ hideChart: true });
    });

    it('should update interval when onTimeIntervalChange is called', async () => {
      const stateContainer = getStateContainer();
      const {
        hook: { result },
      } = await renderUseDiscoverHistogram({
        stateContainer,
      });
      act(() => {
        result.current?.onTimeIntervalChange('auto');
      });
      expect(stateContainer.setAppState).toHaveBeenCalledWith({ interval: 'auto' });
    });

    it('should update breakdownField when onBreakdownFieldChange is called', async () => {
      const stateContainer = getStateContainer();
      const {
        hook: { result },
      } = await renderUseDiscoverHistogram({
        stateContainer,
      });
      act(() => {
        result.current?.onBreakdownFieldChange(
          dataViewWithTimefieldMock.getFieldByName('extension')
        );
      });
      expect(stateContainer.setAppState).toHaveBeenCalledWith({ breakdownField: 'extension' });
    });

    it('should update total hits when onTotalHitsChange is called', async () => {
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
      const { hook } = await renderUseDiscoverHistogram({ totalHits$, main$ });
      act(() => {
        hook.result.current?.onTotalHitsChange(UnifiedHistogramFetchStatus.complete, 100);
      });
      hook.rerender();
      expect(hook.result.current?.hits?.status).toBe(UnifiedHistogramFetchStatus.complete);
      expect(hook.result.current?.hits?.total).toBe(100);
      expect(totalHits$.value).toEqual({
        fetchStatus: FetchStatus.COMPLETE,
        result: 100,
      });
      expect(mockCheckHitCount).toHaveBeenCalledWith(main$, 100);
    });

    it('should not update total hits when onTotalHitsChange is called with an error', async () => {
      mockCheckHitCount.mockClear();
      const totalHits$ = new BehaviorSubject({
        fetchStatus: FetchStatus.UNINITIALIZED,
        result: undefined,
      }) as DataTotalHits$;
      const { hook } = await renderUseDiscoverHistogram({ totalHits$ });
      const error = new Error('test');
      act(() => {
        hook.result.current?.onTotalHitsChange(UnifiedHistogramFetchStatus.error, error);
      });
      hook.rerender();
      expect(sendErrorTo).toHaveBeenCalledWith(mockData, totalHits$);
      expect(hook.result.current?.hits?.status).toBe(UnifiedHistogramFetchStatus.error);
      expect(hook.result.current?.hits?.total).toBeUndefined();
      expect(totalHits$.value).toEqual({
        fetchStatus: FetchStatus.ERROR,
        error,
      });
      expect(mockCheckHitCount).not.toHaveBeenCalled();
    });

    it('should not update total hits when onTotalHitsChange is called with a loading status while totalHits$ has a partial status', async () => {
      mockCheckHitCount.mockClear();
      const totalHits$ = new BehaviorSubject({
        fetchStatus: FetchStatus.PARTIAL,
        result: undefined,
      }) as DataTotalHits$;
      const { hook } = await renderUseDiscoverHistogram({ totalHits$ });
      act(() => {
        hook.result.current?.onTotalHitsChange(UnifiedHistogramFetchStatus.loading, undefined);
      });
      hook.rerender();
      expect(hook.result.current?.hits?.status).toBe(UnifiedHistogramFetchStatus.partial);
      expect(hook.result.current?.hits?.total).toBeUndefined();
      expect(totalHits$.value).toEqual({
        fetchStatus: FetchStatus.PARTIAL,
        result: undefined,
      });
      expect(mockCheckHitCount).not.toHaveBeenCalled();
    });
  });

  describe('refetching', () => {
    it("should call input$.next({ type: 'refetch' }) when savedSearchFetch$ is triggered", async () => {
      const savedSearchFetch$ = new BehaviorSubject({ reset: false, searchSessionId: '1234' });
      const { hook } = await renderUseDiscoverHistogram({ savedSearchFetch$ });
      const onRefetch = jest.fn();
      hook.result.current?.input$.subscribe(onRefetch);
      act(() => {
        savedSearchFetch$.next({ reset: false, searchSessionId: '1234' });
      });
      expect(onRefetch).toHaveBeenCalledWith({ type: 'refetch' });
    });

    it("should not call input$.next({ type: 'refetch' }) when searchSessionId is not set", async () => {
      const savedSearchFetch$ = new BehaviorSubject({ reset: false, searchSessionId: '1234' });
      const { hook } = await renderUseDiscoverHistogram({
        savedSearchFetch$,
        searchSessionId: null,
      });
      const onRefetch = jest.fn();
      hook.result.current?.input$.subscribe(onRefetch);
      act(() => {
        savedSearchFetch$.next({ reset: false, searchSessionId: '1234' });
      });
      expect(onRefetch).not.toHaveBeenCalled();
    });

    it("should call input$.next({ type: 'refetch' }) when searchSessionId is not set and isPlainRecord is true", async () => {
      const savedSearchFetch$ = new BehaviorSubject({ reset: false, searchSessionId: '1234' });
      const { hook } = await renderUseDiscoverHistogram({
        savedSearchFetch$,
        searchSessionId: null,
        isPlainRecord: true,
      });
      const onRefetch = jest.fn();
      hook.result.current?.input$.subscribe(onRefetch);
      act(() => {
        savedSearchFetch$.next({ reset: false, searchSessionId: '1234' });
      });
      expect(onRefetch).toHaveBeenCalledWith({ type: 'refetch' });
    });

    it('should skip the next refetch when state.hideChart changes from true to false', async () => {
      const savedSearchFetch$ = new BehaviorSubject({ reset: false, searchSessionId: '1234' });
      const { hook } = await renderUseDiscoverHistogram({ savedSearchFetch$ });
      const onRefetch = jest.fn();
      hook.result.current?.input$.subscribe(onRefetch);
      act(() => {
        hook.result.current?.onChartHiddenChange(true);
      });
      act(() => {
        hook.result.current?.onChartHiddenChange(false);
      });
      act(() => {
        savedSearchFetch$.next({ reset: false, searchSessionId: '1234' });
      });
      expect(onRefetch).not.toHaveBeenCalled();
    });
  });
});
